import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import debug, { Debugger } from "debug";
import { Multiaddr } from "multiaddr";

import { ITransportService } from "../transport";
import {
  PacketType,
  IPacket,
  decodeHandshakeAuthdata,
  decodeMessageAuthdata,
  decodeWhoAreYouAuthdata,
  encodeChallengeData,
  createHeader,
  encodeMessageAuthdata,
  createRandomPacket,
  createWhoAreYouPacket,
} from "../packet";
import { ENR } from "../enr";
import { Session } from "./session";
import { IKeypair } from "../keypair";
import {
  Message,
  RequestMessage,
  encode,
  decode,
  ResponseMessage,
  MessageType,
  createFindNodeMessage,
  isRequestType,
} from "../message";
import { IRequestCall, ISessionEvents, ISessionConfig, IChallenge, RequestErrorType } from "./types";
import { getNodeAddress, INodeAddress, INodeContactType, nodeAddressToString, NodeContact } from "./nodeInfo";
import LRUCache from "lru-cache";
import { ConnectionDirection, ERR_INVALID_SIG, NodeAddressString } from ".";
import { TimeoutMap } from "../util";


/**
 * Session management for the Discv5 Discovery service.
 *
 * The `SessionService` is responsible for establishing and maintaining sessions with
 * connected/discovered nodes. Each node, identified by it's [`NodeId`] is associated with a
 * [`Session`]. This service drives the handshakes for establishing the sessions and associated
 * logic for sending/requesting initial connections/ENR's from unknown peers.
 *
 * The `SessionService` also manages the timeouts for each request and reports back RPC failures,
 * session timeouts and received messages. Messages are encrypted and decrypted using the
 * associated `Session` for each node.
 *
 * An ongoing connection is managed by the `Session` struct. A node that provides and ENR with an
 * IP address/port that doesn't match the source, is considered untrusted. Once the IP is updated
 * to match the source, the `Session` is promoted to an established state. RPC requests are not sent
 * to untrusted Sessions, only responses.
 */
export class SessionService extends (EventEmitter as { new(): StrictEventEmitter<EventEmitter, ISessionEvents> }) {
  /**
   * The local ENR
   */
  public enr: ENR;
  /**
   * The keypair to sign the ENR and set up encrypted communication with peers
   */
  public keypair: IKeypair;
  /**
   * The underlying packet transport
   */
  public transport: ITransportService;

  /**
   * Configuration
   */
  private config: ISessionConfig;

  private log: Debugger

  /**
   * Pending raw requests. A list of raw messages we are awaiting a response from the remote.
   *
   * UNBOUNDED: consumer data, responsibility of the app layer to bound
   *
   * Keyed by NodeAddressString
   */
  private activeRequests: TimeoutMap<NodeAddressString, IRequestCall>;

  // WHOAREYOU messages do not include the source node id. We therefore maintain another
  // mapping of active_requests via message_nonce. This allows us to match WHOAREYOU
  // requests with active requests sent.
  /**
   * A mapping of all pending active raw requests message nonces to their NodeAddress.
   *
   * UNBOUNDED: consumer data, responsibility of the app layer to bound
   */
  private activeRequestsNonceMapping: Map<string, INodeAddress>;

  /**
   * Requests awaiting a handshake completion.
   *
   * UNBOUNDED: consumer data, responsibility of the app layer to bound
   *
   * Keyed by NodeAddressString
   */
  private pendingRequests: Map<NodeAddressString, [NodeContact, RequestMessage][]>;

  /**
   * Currently in-progress handshakes with peers.
   *
   * BOUNDED: bounded by expiry and IP rate limiter
   *
   * Keyed by NodeAddressString
   */
  private activeChallenges: LRUCache<NodeAddressString, IChallenge>;

  /**
   * Established sessions with peers.
   *
   * BOUNDED: bounded by expiry and max items
   *
   * Keyed by NodeAddressString
   */
  private sessions: LRUCache<NodeAddressString, Session>;

  constructor(config: ISessionConfig, enr: ENR, keypair: IKeypair, transport: ITransportService) {
    super();
    // ensure the keypair matches the one that signed the ENR
    if (!keypair.publicKey.equals(enr.publicKey)) {
      throw new Error("Provided keypair does not match the provided ENR keypair");
    }
    this.config = config;
    this.enr = enr;
    this.keypair = keypair;
    this.transport = transport;
    this.activeRequests = new TimeoutMap(config.requestTimeout, (k, v) =>
      this.handleRequestTimeout(getNodeAddress(v.contact), v)
    );
    this.activeRequestsNonceMapping = new Map();
    this.pendingRequests = new Map();
    this.activeChallenges = new LRUCache({ maxAge: config.requestTimeout * 2 });
    this.sessions = new LRUCache({ maxAge: config.sessionTimeout, max: config.sessionCacheCapacity });
    this.log = debug(this.enr.nodeId.slice(0, 5)).extend("discv5:sessionService");
  }

  /**
   * Starts the session service, starting the underlying transport service.
   */
  public async start(): Promise<void> {
    this.log(`Starting session service with node id ${this.enr.nodeId}`);
    this.transport.on("decodeError", (err, ma) => this.log("Error processing packet", err, ma));
    this.transport.on("packet", this.processInboundPacket);
    await this.transport.start();
  }

  /**
   * Stops the session service, stopping the underlying transport service.
   */
  public async stop(): Promise<void> {
    this.log("Stopping session service");
    this.transport.removeListener("packet", this.processInboundPacket);
    await this.transport.stop();
    this.activeRequests.clear();
    this.activeRequestsNonceMapping.clear();
    this.pendingRequests.clear();
    this.activeChallenges.reset();
    this.sessions.reset();
  }

  public sessionsSize(): number {
    return this.sessions.length;
  }

  /**
   * Sends an RequestMessage to a node.
   */
  public sendRequest(contact: NodeContact, request: RequestMessage): void {
    const nodeAddr = getNodeAddress(contact);
    const nodeAddrStr = nodeAddressToString(nodeAddr);

    if (nodeAddr.socketAddr.equals(this.transport.multiaddr)) {
      this.log("Filtered request to self");
      return;
    }

    // If there is already an active request for this node, add to the pending requests
    if (this.activeRequests.get(nodeAddrStr)) {
      this.log("Request queued for node: %o", nodeAddr);
      let pendingRequests = this.pendingRequests.get(nodeAddrStr);
      if (!pendingRequests) {
        pendingRequests = [];
        this.pendingRequests.set(nodeAddrStr, pendingRequests);
      }
      pendingRequests.push([contact, request]);
      return;
    }

    const session = this.sessions.get(nodeAddrStr);
    let packet, initiatingSession;
    if (session) {
      // Encrypt the message and send
      packet = session.encryptMessage(this.enr.nodeId, nodeAddr.nodeId, encode(request));
      initiatingSession = false;
    } else {
      // No session exists, start a new handshake
      this.log("No session established, sending a random packet to: %o", nodeAddr);

      // We are initiating a new session
      packet = createRandomPacket(this.enr.nodeId);
      initiatingSession = true;
    }

    const call: IRequestCall = {
      contact,
      packet,
      request,
      initiatingSession,
      handshakeSent: false,
      retries: 1,
    };

    // let the filter know we are expecting a response
    this.addExpectedResponse(nodeAddr.socketAddr);

    this.send(nodeAddr, packet);

    this.activeRequestsNonceMapping.set(packet.header.nonce.toString("hex"), nodeAddr);
    this.activeRequests.set(nodeAddrStr, call);
  }

  /**
   * Sends an RPC response
   */
  public sendResponse(nodeAddr: INodeAddress, response: ResponseMessage): void {
    const nodeAddrStr = nodeAddressToString(nodeAddr);

    // Check for an established session
    const session = this.sessions.get(nodeAddrStr);
    if (!session) {
      this.log("Response could not be sent, no session exists to node: %o", nodeAddr);
      return;
    }

    // Encrypt the message and send
    let packet;
    try {
      packet = session.encryptMessage(this.enr.nodeId, nodeAddr.nodeId, encode(response));
    } catch (e) {
      this.log("Could not encrypt response: %s", e);
      return;
    }

    this.send(nodeAddr, packet);
  }

  /**
   * This is called in response to a "whoAreYouRequest" event.
   * The applications finds the highest known ENR for a node then we respond to the node with a WHOAREYOU packet.
   */
  public sendChallenge(nodeAddr: INodeAddress, nonce: Buffer, remoteEnr: ENR | null): void {
    const nodeAddrStr = nodeAddressToString(nodeAddr);

    if (this.activeChallenges.peek(nodeAddrStr)) {
      this.log("WHOAREYOU already sent. %o", nodeAddr);
      return;
    }

    // Ignore this request if the session is already established
    if (this.sessions.get(nodeAddrStr)) {
      this.log("Session already established. WHOAREYOU not sent to %o", nodeAddr);
      return;
    }

    // It could be the case we have sent an ENR with an active request, however we consider
    // these independent as this is in response to an unknown packet. If the ENR it not in our
    // table (remote_enr is None) then we re-request the ENR to keep the session up to date.

    // send the challenge
    const enrSeq = remoteEnr?.seq ?? 0n;
    const packet = createWhoAreYouPacket(nonce, enrSeq);
    const challengeData = encodeChallengeData(packet.maskingIv, packet.header);

    this.log("Sending WHOAREYOU to %o", nodeAddr);
    this.send(nodeAddr, packet);

    this.activeChallenges.set(nodeAddrStr, { data: challengeData, remoteEnr: remoteEnr ?? undefined });
  }

  public processInboundPacket = (src: Multiaddr, packet: IPacket): void => {
    switch (packet.header.flag) {
      case PacketType.WhoAreYou:
        return this.handleChallenge(src, packet);
      case PacketType.Handshake:
        return this.handleHandshake(src, packet);
      case PacketType.Message:
        return this.handleMessage(src, packet);
    }
  };

  private handleChallenge(src: Multiaddr, packet: IPacket): void {
    // First decode the authdata
    let authdata;
    try {
      authdata = decodeWhoAreYouAuthdata(packet.header.authdata);
    } catch (e) {
      this.log("Cannot decode WHOAREYOU authdata from %s: %s", src.toString(), e);
      return;
    }
    const nonce = packet.header.nonce.toString("hex");

    // Check that this challenge matches a known active request.
    // If this message passes all the requisite checks, a request call is returned.

    // Check for an active request
    const nodeAddr = this.activeRequestsNonceMapping.get(nonce);
    if (!nodeAddr) {
      this.log(
        "Received a WHOAREYOU packet that references an unknown or expired request. source: %s, token: %s",
        src.toString(),
        nonce
      );
      return;
    }

    // Verify that the src_addresses match
    if (!nodeAddr.socketAddr.equals(src)) {
      this.log(
        // eslint-disable-next-line max-len
        "Received a WHOAREYOU packet for a message with a non-expected source. Source %s, expected_source: %s message_nonce %s",
        src.toString(),
        nodeAddr.socketAddr.toString(),
        nonce
      );
      return;
    }
    this.activeRequestsNonceMapping.delete(nonce);

    // Obtain the request from the mapping. This must exist, otherwise there is a
    // serious coding error. The active_requests_nonce_mapping and active_requests
    // mappings should be 1 to 1.
    const nodeAddrStr = nodeAddressToString(nodeAddr);
    const requestCall = this.activeRequests.get(nodeAddrStr);
    if (!requestCall) {
      this.log(
        // eslint-disable-next-line max-len
        "Active request mappings are not in sync. Message_id %s, node_address %o doesn't exist in active request mapping",
        nonce,
        nodeAddr
      );
      return;
    }
    this.activeRequests.delete(nodeAddrStr);

    // double check the message nonces match
    const requestNonce = requestCall.packet.header.nonce.toString("hex");
    if (requestNonce !== nonce) {
      // This could theoretically happen if a peer uses the same node id across
      // different connections.
      this.log(
        "Received a WHOAREYOU from a non expected source. Source: %o, message_nonce %s , expected_nonce: %s",
        requestCall.contact,
        nonce,
        requestNonce
      );
      return;
    }

    this.log("Received a WHOAREYOU packet. source: %s", src.toString());

    // We do not allow multiple WHOAREYOU packets for a single challenge request. If we have
    // already sent a WHOAREYOU ourselves, we drop sessions who send us a WHOAREYOU in
    // response.
    if (requestCall.handshakeSent) {
      this.log("Authentication response already sent. Dropping session. Node: %s", requestCall.contact);
      this.failRequest(requestCall, RequestErrorType.InvalidRemotePacket, true);
      return;
    }

    // Encrypt the message with an auth header and respond

    // First if a new version of our ENR is requested, obtain it for the header
    const updatedEnr = authdata.enrSeq < this.enr.seq ? this.enr.encode(this.keypair.privateKey) : null;

    // Generate a new session and authentication packet
    const [authPacket, session] = Session.encryptWithHeader(
      requestCall.contact,
      this.keypair,
      this.enr.nodeId,
      updatedEnr,
      encodeChallengeData(packet.maskingIv, packet.header),
      encode(requestCall.request)
    );

    // There are two quirks with an established session at this point.
    // 1. We may not know the ENR if we dialed this node with a NodeContact::Raw. In this case
    //    we need to set up a request to find the ENR and wait for a response before we
    //    officially call this node established.
    // 2. The challenge here could be to an already established session. If so, we need to
    //    update the existing session to attempt to decrypt future messages with the new keys
    //    and update the keys internally upon successful decryption.
    //
    // We handle both of these cases here.

    // Check if we know the ENR, if not request it and flag the session as awaiting an ENR.
    //
    // All sent requests must have an associated node_id. Therefore the following
    // must not panic.
    switch (requestCall.contact.type) {
      case INodeContactType.ENR: {
        // NOTE: Here we decide if the session is outgoing or ingoing. The condition for an
        // outgoing session is that we originally sent a RANDOM packet (signifying we did
        // not have a session for a request) and the packet is not a PING (we are not
        // trying to update an old session that may have expired.
        let connectionDirection;
        if (requestCall.initiatingSession) {
          if (requestCall.request.type === MessageType.PING) {
            connectionDirection = ConnectionDirection.Incoming;
          } else {
            connectionDirection = ConnectionDirection.Outgoing;
          }
        } else {
          connectionDirection = ConnectionDirection.Incoming;
        }

        // We already know the ENR. Send the handshake response packet
        this.log("Sending authentication response to node: %o", nodeAddr);

        requestCall.packet = authPacket;
        requestCall.handshakeSent = true;
        requestCall.initiatingSession = false;

        // Reinsert the request call
        this.insertActiveRequest(requestCall);

        // Send the actual packet
        this.send(nodeAddr, authPacket);

        // Notify the application that the session has been established
        this.emit("established", requestCall.contact.enr, connectionDirection);
        break;
      }
      case INodeContactType.Raw: {
        // Don't know the ENR. Establish the session, but request an ENR

        // Send the handshake response packet
        this.log("Sending authentication response to node: %o", nodeAddr);

        requestCall.packet = authPacket;
        requestCall.handshakeSent = true;

        // Reinsert the request call
        this.insertActiveRequest(requestCall);

        // Send the actual request
        this.send(nodeAddr, authPacket);

        // send FINDNODE 0
        const request = createFindNodeMessage([0]);
        session.awaitingEnr = request.id;
        this.sendRequest(requestCall.contact, request);
        break;
      }
    }

    this.newSession(nodeAddr, session);
  }

  /**
   * Verifies a Node ENR to its observed address.
   * If it fails, any associated session is also considered failed.
   * If it succeeds, we notify the application
   */
  private verifyEnr(enr: ENR, nodeAddr: INodeAddress): boolean {
    // If the ENR does not match the observed IP addresses,
    // we consider the session failed.
    const enrMultiaddr = enr.getLocationMultiaddr("udp");
    return enr.nodeId === nodeAddr.nodeId && (enrMultiaddr?.equals(nodeAddr.socketAddr) ?? true);
  }

  /** Handle a message that contains an authentication header */
  private handleHandshake(src: Multiaddr, packet: IPacket): void {
    // Needs to match an outgoing WHOAREYOU packet (so we have the required nonce to be signed).
    // If it doesn't we drop the packet.
    // This will lead to future outgoing WHOAREYOU packets if they proceed to send further encrypted packets
    let authdata;
    try {
      authdata = decodeHandshakeAuthdata(packet.header.authdata);
    } catch (e) {
      this.log("Unable to decode handkshake authdata: %s", e);
      return;
    }
    const nodeAddr = {
      socketAddr: src,
      nodeId: authdata.srcId,
    };
    const nodeAddrStr = nodeAddressToString(nodeAddr);

    this.log("Received an authentication message from: %o", nodeAddr);

    const challenge = this.activeChallenges.get(nodeAddrStr);
    if (!challenge) {
      this.log("Received an authenticated header without a matching WHOAREYOU request. %o", nodeAddr);
      return;
    }
    this.activeChallenges.del(nodeAddrStr);

    try {
      const [session, enr] = Session.establishFromChallenge(
        this.keypair,
        this.enr.nodeId,
        nodeAddr.nodeId,
        challenge,
        authdata.idSignature,
        authdata.ephPubkey,
        authdata.record
      );

      // Receiving an AuthResponse must give us an up-to-date view of the node ENR.
      // Verify the ENR is valid
      if (this.verifyEnr(enr, nodeAddr)) {
        // Session is valid
        // Notify the application
        // The session established here are from WHOAREYOU packets that we sent.
        // This occurs when a node established a connection with us.
        this.emit("established", enr, ConnectionDirection.Incoming);

        this.newSession(nodeAddr, session);

        // decrypt the message
        this.handleMessage(src, {
          maskingIv: packet.maskingIv,
          header: createHeader(
            PacketType.Message,
            encodeMessageAuthdata({ srcId: nodeAddr.nodeId }),
            packet.header.nonce
          ),
          message: packet.message,
          messageAd: encodeChallengeData(packet.maskingIv, packet.header),
        });
      }
    } catch (e) {
      if ((e as Error).name === ERR_INVALID_SIG) {
        this.log("Authentication header contained invalid signature. Ignoring packet from: %o", nodeAddr);
        this.activeChallenges.set(nodeAddrStr, challenge);
      } else {
        this.log("Invalid Authentication header. Dropping session. %s", e);
        this.failSession(nodeAddr, RequestErrorType.InvalidRemotePacket, true);
      }
    }
  }

  private handleMessage(src: Multiaddr, packet: IPacket): void {
    let authdata;
    try {
      authdata = decodeMessageAuthdata(packet.header.authdata);
    } catch (e) {
      this.log("Cannot decode message authdata: %s", e);
      return;
    }
    const nodeAddr = {
      socketAddr: src,
      nodeId: authdata.srcId,
    };
    const nodeAddrStr = nodeAddressToString(nodeAddr);

    // check if we have an available session
    const session = this.sessions.get(nodeAddrStr);
    if (!session) {
      // Received a message without a session.
      this.log("Received a message without a session. from: %o", nodeAddr);
      this.log("Requesting a WHOAREYOU packet to be sent.");

      // spawn a WHOAREYOU event to check for highest known ENR
      this.emit("whoAreYouRequest", nodeAddr, packet.header.nonce);
      return;
    }

    // attempt to decrypt and process the message
    let encodedMessage;
    try {
      encodedMessage = session.decryptMessage(
        packet.header.nonce,
        packet.message,
        packet.messageAd || encodeChallengeData(packet.maskingIv, packet.header)
      );
    } catch (e) {
      // We have a session but the message could not be decrypted.
      // It is likely the node sending this message has dropped their session.
      // In this case, this message is a random packet and we should reply with a WHOAREYOU.
      // This means we need to drop the current session and re-establish.
      this.log("Message from node: %o is not encrypted with known session keys. Requesting a WHOAREYOU packet", nodeAddr);
      this.failSession(nodeAddr, RequestErrorType.InvalidRemotePacket, true);

      // If we haven't already sent a WhoAreYou,
      // spawn a WHOAREYOU event to check for highest known ENR
      // Update the cache time and remove expired entries.
      if (!this.activeChallenges.peek(nodeAddrStr)) {
        this.emit("whoAreYouRequest", nodeAddr, packet.header.nonce);
      } else {
        this.log("WHOAREYOU packet already sent: %o", nodeAddr);
      }
      return;
    }
    let message: Message;
    try {
      message = decode(encodedMessage);
    } catch (e) {
      this.log("Failed to decode message. Error: %s", (e as Error).message);
      return;
    }

    this.log("Received message from: %o", nodeAddr);

    if (isRequestType(message.type)) {
      // report the request to the application
      this.emit("request", nodeAddr, message as RequestMessage);
    } else {
      // Response
      // Sessions could be awaiting an ENR response.
      // Check if this response matches these
      const requestId = session.awaitingEnr;
      if (requestId !== undefined) {
        if (requestId === message.id) {
          delete session.awaitingEnr;
          if (message.type === MessageType.NODES) {
            // Received the requested ENR
            const enr = message.enrs.pop();
            if (enr) {
              if (this.verifyEnr(enr, nodeAddr)) {
                // Notify the application
                // This can occur when we try to dial a node without an
                // ENR. In this case we have attempted to establish the
                // connection, so this is an outgoing connection.
                this.emit("established", enr, ConnectionDirection.Outgoing);
                return;
              }
            }
          }

          this.log("Session failed invalid ENR response");
          this.failSession(nodeAddr, RequestErrorType.InvalidRemoteENR, true);
          return;
        }
      }

      // Handle standard responses
      this.handleResponse(nodeAddr, message as ResponseMessage);
    }
  }

  /**
   * Handles a response to a request.
   * Re-inserts the request call if the response is a multiple Nodes response.
   */
  private handleResponse(nodeAddr: INodeAddress, response: ResponseMessage): void {
    const nodeAddrStr = nodeAddressToString(nodeAddr);

    // Find a matching request, if any
    const requestCall = this.activeRequests.get(nodeAddrStr);
    if (!requestCall) {
      // This is likely a late response and we have already failed the request.
      // These get dropped here.
      this.log("Late response from node: %o", nodeAddr);
      return;
    }

    if (requestCall.request.id !== response.id) {
      this.log("Received an RPC Response to an unknown request. Likely late response. %o", nodeAddr);
      return;
    }
    this.activeRequests.delete(nodeAddrStr);

    // The response matches a request

    // Check to see if this is a Nodes response, in which case we may require to wait for extra responses
    if (response.type === MessageType.NODES) {
      if (response.total > 1) {
        // This is a multi-response Nodes response
        if (requestCall.remainingResponses === undefined) {
          // This is the first nodes response
          requestCall.remainingResponses = response.total - 1;
          // add back the request and send the response
          this.activeRequests.set(nodeAddrStr, requestCall);
          this.emit("response", nodeAddr, response);
          return;
        } else {
          // This is not the first nodes response
          requestCall.remainingResponses--;
          if (requestCall.remainingResponses !== 0) {
            // more responses remaining, add back the request and send the response
            // add back the request and send the response
            this.activeRequests.set(nodeAddrStr, requestCall);
            this.emit("response", nodeAddr, response);
            return;
          }
        }
      }
    }

    // Remove the associated nonce mapping.
    this.activeRequestsNonceMapping.delete(requestCall.packet.header.nonce.toString("hex"));

    // Remove the expected response
    this.removeExpectedResponse(nodeAddr.socketAddr);

    // The request matches, report the response
    this.emit("response", nodeAddr, response);

    this.sendNextRequest(nodeAddr);
  }

  /**
   * Inserts a request and associated authTag mapping
   */
  private insertActiveRequest(requestCall: IRequestCall): void {
    const nodeAddr = getNodeAddress(requestCall.contact);
    const nodeAddrStr = nodeAddressToString(nodeAddr);
    this.activeRequestsNonceMapping.set(requestCall.packet.header.nonce.toString("hex"), nodeAddr);
    this.activeRequests.set(nodeAddrStr, requestCall);
  }

  private newSession(nodeAddr: INodeAddress, session: Session): void {
    const nodeAddrStr = nodeAddressToString(nodeAddr);
    const currentSession = this.sessions.get(nodeAddrStr);

    this.log("New session with: %o", nodeAddr);
    if (currentSession) {
      currentSession.update(session);
    } else {
      this.sessions.set(nodeAddrStr, session);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private removeExpectedResponse(socketAddr: Multiaddr): void {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private addExpectedResponse(socketAddr: Multiaddr): void {
    //
  }

  private handleRequestTimeout(nodeAddr: INodeAddress, requestCall: IRequestCall): void {
    if (requestCall.retries >= this.config.requestRetries) {
      this.log("Request timed out with %o", nodeAddr);

      // Remove the associated nonce mapping
      this.activeRequestsNonceMapping.delete(requestCall.packet.header.nonce.toString("hex"));
      this.removeExpectedResponse(nodeAddr.socketAddr);

      // The request has timed out.
      // We keep any established session fo future use.
      this.failRequest(requestCall, RequestErrorType.Timeout, false);
    } else {
      const nodeAddrStr = nodeAddressToString(nodeAddr);

      // increment the request retry count and restart the timeout
      this.log("Resending message to: %o", nodeAddr);
      this.send(nodeAddr, requestCall.packet);
      requestCall.retries++;
      this.activeRequests.set(nodeAddrStr, requestCall);
    }
  }

  private sendNextRequest(nodeAddr: INodeAddress): void {
    const nodeAddrStr = nodeAddressToString(nodeAddr);
    // ensure we are not overwriting any existing requests

    if (!this.activeRequests.get(nodeAddrStr)) {
      const entry = this.pendingRequests.get(nodeAddrStr);
      if (entry) {
        // if it exists, there must be a request here
        const request = entry.shift()!;
        if (!entry.length) {
          this.pendingRequests.delete(nodeAddrStr);
        }

        this.log("Sending next awaiting message. Node: %o", request[0]);
        this.sendRequest(request[0], request[1]);
      }
    }
  }

  /**
   * A request has failed
   */
  private failRequest(requestCall: IRequestCall, error: RequestErrorType, removeSession: boolean): void {
    // The request has expored, remove the session.
    // Remove the associated nonce mapping.
    this.activeRequestsNonceMapping.delete(requestCall.packet.header.nonce.toString("hex"));

    // Fail the current request
    this.emit("requestFailed", requestCall.request.id, error);

    const nodeAddr = getNodeAddress(requestCall.contact);
    this.failSession(nodeAddr, error, removeSession);
  }

  /**
   * Removes a session
   */
  private failSession(nodeAddr: INodeAddress, error: RequestErrorType, removeSession: boolean): void {
    const nodeAddrStr = nodeAddressToString(nodeAddr);
    if (removeSession) {
      this.sessions.del(nodeAddrStr);
    }

    const requests = this.pendingRequests.get(nodeAddrStr);
    if (requests) {
      this.pendingRequests.delete(nodeAddrStr);

      for (let i = 0; i < requests.length; i++) {
        this.emit("requestFailed", requests[i][1].id, error);
      }
    }
  }

  private send(nodeAddr: INodeAddress, packet: IPacket): void {
    this.transport.send(nodeAddr.socketAddr, nodeAddr.nodeId, packet);
  }
}
