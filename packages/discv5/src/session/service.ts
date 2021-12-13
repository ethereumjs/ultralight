import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import debug from "debug";
import { Multiaddr } from "multiaddr";

import { ITransportService, WebSocketTransportService } from "../transport";
import {
  PacketType,
  IPacket,
  decodeHandshakeAuthdata,
  decodeMessageAuthdata,
  decodeWhoAreYouAuthdata,
  encodeChallengeData,
  createHeader,
  encodeMessageAuthdata,
} from "../packet";
import { ENR, NodeId } from "../enr";
import { Session } from "./session";
import { IKeypair } from "../keypair";
import { TimeoutMap } from "../util";
import { Message, RequestMessage, encode, decode, ResponseMessage, RequestId, MessageType } from "../message";
import { IPendingRequest, SessionState, ISessionEvents, ISessionConfig } from "./types";

const log = debug("discv5:sessionService");

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
export class SessionService extends (EventEmitter as { new (): StrictEventEmitter<EventEmitter, ISessionEvents> }) {
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
  /**
   * Pending raw requests
   * A collection of request objects we are awaiting a response from the remote.
   * These are indexed by multiaddr string as WHOAREYOU packets do not return a source node id to
   * match against.
   * We need to keep pending requests for sessions not yet fully connected.
   */
  private pendingRequests: Map<string, TimeoutMap<RequestId, IPendingRequest>>;
  /**
   * Messages awaiting to be sent once a handshake has been established
   */
  private pendingMessages: Map<NodeId, RequestMessage[]>;
  /**
   * Sessions that have been created for each node id. These can be established or
   * awaiting response from remote nodes
   */
  private sessions: TimeoutMap<NodeId, Session>;

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
    this.pendingRequests = new Map();
    this.pendingMessages = new Map();
    this.sessions = new TimeoutMap(this.config.sessionTimeout, this.onSessionTimeout);
  }

  /**
   * Starts the session service, starting the underlying transport service.
   */
  public async start(): Promise<void> {
    log(`Starting session service with node id ${this.enr.nodeId}`);
    this.transport.on("packet", this.onPacket);
    this.transport.on("decodeError", (err, ma) => log("Error processing packet", err, ma));
    await this.transport.start();
  }

  /**
   * Stops the session service, stopping the underlying transport service.
   */
  public async stop(): Promise<void> {
    log("Stopping session service");
    this.transport.removeAllListeners();
    await this.transport.stop();
    for (const requestMap of this.pendingRequests.values()) {
      requestMap.clear();
    }
    this.pendingRequests.clear();
    this.pendingMessages.clear();
    this.sessions.clear();
  }

  public sessionsSize(): number {
    return this.sessions.size;
  }

  public updateEnr(enr: ENR): void {
    const session = this.sessions.get(enr.nodeId);
    if (session) {
      if (session.updateEnr(enr)) {
        // A session has be been promoted to established.
        this.emit("established", enr);
      }
    }
  }

  /**
   * Sends an RequestMessage request to a known ENR.
   * It is possible to send requests to IP addresses not related to the ENR.
   */
  public sendRequest(dstEnr: ENR, message: RequestMessage): void {
    const dstId = dstEnr.nodeId;
    const transport = this.transport instanceof WebSocketTransportService ? "udp" : "udp";
    const dst = dstEnr.getLocationMultiaddr(transport);

    if (!dst) {
      throw new Error(`ENR must have ${transport} socket data`);
    }
    const session = this.sessions.get(dstId);
    if (!session) {
      log("No session established, sending a random packet to: %s on %s", dstId, dst.toString());
      // cache message
      const msgs = this.pendingMessages.get(dstId);
      if (msgs) {
        msgs.push(message);
      } else {
        this.pendingMessages.set(dstId, [message]);
      }
      // need to establish a new session, send a random packet
      const [session, packet] = Session.createWithRandom(this.enr.nodeId, dstEnr);
      this.sessions.set(dstId, session);
      this.processRequest(dstId, dst, packet, message);
      return;
    }
    if (!session.trustedEstablished()) {
      throw new Error("Session is being established, request failed");
    }
    if (!session.isTrusted()) {
      throw new Error("Tried to send a request to an untrusted node");
    }
    // encrypt the message and send
    log("Sending request: %O to %s on %s", message, dstId, dst.toString());
    const packet = session.encryptMessage(this.enr.nodeId, dstId, encode(message));
    this.processRequest(dstId, dst, packet, message);
  }

  /**
   * Similar to `sendRequest` but for requests which an ENR may be unknown.
   * A session is therefore assumed to be valid
   */
  public sendRequestUnknownEnr(dst: Multiaddr, dstId: NodeId, message: RequestMessage): void {
    // session should be established
    const session = this.sessions.get(dstId);
    if (!session) {
      throw new Error("Request without an ENR could not be sent, no session exists");
    }

    log("Sending request w/o ENR: %O to %s on %s", message, dstId, dst.toString());
    const packet = session.encryptMessage(this.enr.nodeId, dstId, encode(message));
    this.processRequest(dstId, dst, packet, message);
  }

  /**
   * Sends a response
   * This differs from `sendRequest` as responses do not require a known ENR to send messages
   * and sessions should already be established
   */
  public sendResponse(dst: Multiaddr, dstId: NodeId, message: ResponseMessage): void {
    // session should be established
    const session = this.sessions.get(dstId);
    if (!session) {
      throw new Error("Response could not be sent, no session exists");
    }
    log("Sending %s response to %s at %s", MessageType[message.type], dstId, dst.toString());
    const packet = session.encryptMessage(this.enr.nodeId, dstId, encode(message));
    this.transport.send(dst, dstId, packet);
  }

  public sendWhoAreYou(dst: Multiaddr, dstId: NodeId, enrSeq: bigint, remoteEnr: ENR | null, nonce: Buffer): void {
    // _session will be overwritten if not trusted-established or state.whoareyousent
    const _session = this.sessions.get(dstId);
    if (_session) {
      // If a WHOAREYOU is already sent or a session is already established, ignore this request
      if (_session.trustedEstablished() || _session.state.state === SessionState.WhoAreYouSent) {
        // session exists, WhoAreYou packet not sent
        log("Session exists, WHOAREYOU packet not sent");
        return;
      }
    }
    log("Sending WHOAREYOU to: %s on %s", dstId, dst.toString());
    const [session, packet] = Session.createWithWhoAreYou(nonce, enrSeq, remoteEnr);
    this.sessions.set(dstId, session);
    this.processRequest(dstId, dst, packet);
  }

  public onWhoAreYou(src: Multiaddr, packet: IPacket): void {
    let authdata;
    try {
      authdata = decodeWhoAreYouAuthdata(packet.header.authdata);
    } catch (e) {
      log("Cannot decode WHOAREYOU authdata from %s: %s", src.toString(), e);
      return;
    }
    const nonce = packet.header.nonce;
    const srcStr = src.toString();
    const pendingRequests = this.pendingRequests.get(srcStr);
    if (!pendingRequests) {
      // Received a WHOAREYOU packet that references an unknown or expired request.
      log(
        "Received a WHOAREYOU packet that references an unknown or expired request - no pending requests. source: %s, token: %s",
        srcStr,
        nonce.toString("hex")
      );
      return;
    }
    const request = Array.from(pendingRequests.values()).find((r) => nonce.equals(r.packet.header.nonce));
    if (!request) {
      // Received a WHOAREYOU packet that references an unknown or expired request.
      log(
        "Received a WHOAREYOU packet that references an unknown or expired request - nonce not found. source: %s, token: %s",
        srcStr,
        nonce.toString("hex")
      );
      return;
    }
    if (pendingRequests.size === 1) {
      this.pendingRequests.delete(srcStr);
    }
    pendingRequests.delete(request.message ? request.message.id : 0n);

    log("Received a WHOAREYOU packet. source: %s", src.toString());

    // This is an assumed NodeId. We sent the packet to this NodeId and can only verify it against the
    // originating IP address. We assume it comes from this NodeId.
    const srcId = request.dstId;

    const session = this.sessions.get(srcId);
    if (!session) {
      // Received a WhoAreYou packet without having an established session
      log("Received a WHOAREYOU packet without having an established session.");
      return;
    }

    // Determine which message to send back. A WhoAreYou could refer to the random packet
    // sent during establishing a connection, or their session has expired on one of our
    // send messages and we need to re-encrypt it
    let message: RequestMessage;
    if (session.state.state === SessionState.RandomSent) {
      // get the messages that are waiting for an established session
      const messages = this.pendingMessages.get(srcId);
      if (!messages || !messages.length) {
        log("No pending messages found for WHOAREYOU request.");
        return;
      }
      message = messages.shift() as RequestMessage;
      this.pendingMessages.set(srcId, messages);
    } else {
      // re-send the original message
      if (!request.message) {
        log("All non-random requests must have an unencrypted message");
        return;
      }
      message = request.message as RequestMessage;
    }
    // Update the session (this must be the socket that we sent the referenced request to)
    session.lastSeenMultiaddr = src;

    // Update the ENR record if necessary
    let updatedEnr: Buffer | null = null;
    if (authdata.enrSeq < this.enr.seq) {
      updatedEnr = this.enr.encode(this.keypair.privateKey);
    }

    // Generate session keys and encrypt the earliest packet in a handshake packet
    let handshakePacket: IPacket;
    try {
      handshakePacket = session.encryptWithHandshake(
        this.keypair,
        encodeChallengeData(packet.maskingIv, packet.header),
        this.enr.nodeId,
        updatedEnr,
        encode(message)
      );
    } catch (e) {
      // insert the message back into the pending queue
      let messages = this.pendingMessages.get(srcId);
      if (!messages) {
        messages = [];
      }
      messages.unshift(message);
      this.pendingMessages.set(srcId, messages);
      log("Could not generate a session: error: %O", e);
      return;
    }

    log("Sending authentication message: %O to node: %s on %s", message, srcId, src.toString());

    // send the response
    this.processRequest(srcId, src, handshakePacket, message);

    // flush the message cache
    this.flushMessages(srcId, src);
  }

  public onHandshake(src: Multiaddr, packet: IPacket): void {
    const srcStr = src.toString();
    // Needs to match an outgoing WHOAREYOU packet (so we have the required nonce to be signed).
    // If it doesn't we drop the packet.
    // This will lead to future outgoing WHOAREYOU packets if they proceed to send further encrypted packets
    let authdata;
    try {
      authdata = decodeHandshakeAuthdata(packet.header.authdata);
    } catch (e) {
      log("Unable to decode handkshake authdata: %s", e);
      return;
    }
    const srcId = authdata.srcId;
    log("Received an authentication message from: %s on %s", srcId, src);

    const session = this.sessions.get(srcId);
    if (!session) {
      log("Received an authenticated header without a known session, dropping.");
      return;
    }

    if (session.state.state !== SessionState.WhoAreYouSent) {
      log("Received an authenticated header without a known WHOAREYOU session, dropping.");
      return;
    }

    const pendingRequests = this.pendingRequests.get(srcStr);
    if (!pendingRequests) {
      log("Received an authenticated header without a matching WHOAREYOU request, dropping.");
      return;
    }
    const request = Array.from(pendingRequests.values()).find(
      (r) => r.packet.header.flag === PacketType.WhoAreYou && r.dstId === srcId
    );
    if (!request) {
      log("Received an authenticated header without a matching WHOAREYOU request, dropping.");
      return;
    }
    if (pendingRequests.size === 1) {
      this.pendingRequests.delete(srcStr);
    }
    pendingRequests.delete(request.message ? request.message.id : 0n);

    // update the sessions last seen socket
    session.lastSeenMultiaddr = src;

    // establish the session
    try {
      const trusted = session.establishFromHandshake(this.keypair, this.enr.nodeId, srcId, authdata);
      if (trusted) {
        log("Session established with node from header: %s", srcId);
        // session is trusted, notify the protocol
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.emit("established", session.remoteEnr!);
        // flush messages
        this.flushMessages(srcId, src);
      }
    } catch (e) {
      log("Invalid Authentication header. Dropping session. Error: %O", e);
      this.sessions.delete(srcId);
      this.pendingMessages.delete(srcId);
      return;
    }

    // session has been established, update the timeout
    this.sessions.setTimeout(srcId, this.config.sessionTimeout);

    // decrypt the message
    this.onMessage(src, {
      maskingIv: packet.maskingIv,
      header: createHeader(PacketType.Message, encodeMessageAuthdata({ srcId }), packet.header.nonce),
      message: packet.message,
      messageAd: encodeChallengeData(packet.maskingIv, packet.header),
    });
  }

  public onMessage(src: Multiaddr, packet: IPacket): void {
    let authdata;
    try {
      authdata = decodeMessageAuthdata(packet.header.authdata);
    } catch (e) {
      log("Cannot decode message authdata: %s", e);
      return;
    }
    const srcId = authdata.srcId;

    // check if we have an available session
    const session = this.sessions.get(srcId);
    if (!session) {
      // Received a message without a session.
      log("Received a message without a session. from: %s at %s", srcId, src.toString());
      log("Requesting a WHOAREYOU packet to be sent.");

      // spawn a WHOAREYOU event to check for highest known ENR
      this.emit("whoAreYouRequest", srcId, src, packet.header.nonce);
      return;
    }
    // if we have sent a random packet, upgrade to a WHOAREYOU request
    if (session.state.state === SessionState.RandomSent) {
      this.emit("whoAreYouRequest", srcId, src, packet.header.nonce);
    } else if (session.state.state === SessionState.WhoAreYouSent) {
      // Waiting for a session to be generated
      log("Waiting for a session to be generated. from: %s at %s", srcId, src);

      // potentially store and decrypt once we receive the packet
      // drop it for now
      return;
    }
    // We could be in the AwaitingResponse state. If so, this message could establish a new
    // session with a node. We keep track to see if the decryption uupdates the session. If so,
    // we notify the user and flush all cached messages.
    const sessionWasAwaiting = session.state.state === SessionState.AwaitingResponse;

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
      log("Message from node: %s is not encrypted with known session keys. Requesting a WHOAREYOU packet", srcId);
      this.sessions.delete(srcId);
      this.emit("whoAreYouRequest", srcId, src, packet.header.nonce);
      return;
    }
    let message: Message;
    try {
      message = decode(encodedMessage);
    } catch (e) {
      throw new Error(`Failed to decode message. Error: ${e.message}`);
    }

    // Remove any associated request from pendingRequests
    const pendingRequests = this.pendingRequests.get(src.toString());
    if (pendingRequests) {
      pendingRequests.delete(message.id);
    }

    // update the lastSeenSocket and check if we need to promote the session to trusted
    session.lastSeenMultiaddr = src;

    // There are two possibilities as session could have been established.
    // The lastest message addr matches the addr in the known ENR and upgrades the session to an established state,
    // or, we were awaiting a message to be decrypted with new session keys,
    // this just arrived and now we consider the session established.
    // In both cases, we notify the user and flush the cached messages
    if (
      (session.updateTrusted() && session.trustedEstablished()) ||
      (session.trustedEstablished() && sessionWasAwaiting)
    ) {
      // session has been established, notify the protocol
      log("Session established with node from updated: %s", srcId);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.emit("established", session.remoteEnr!);
      // flush messages
      this.flushMessages(srcId, src);
    }
    // We have received a new message. Notify the protocol
    log("Message received: %s from: %s on %s", MessageType[message.type], srcId, src);
    this.emit("message", srcId, src, message);
  }

  public onPacket = (src: Multiaddr, packet: IPacket): void => {
    log("packet received from ", src.toString());
    switch (packet.header.flag) {
      case PacketType.WhoAreYou:
        return this.onWhoAreYou(src, packet);
      case PacketType.Handshake:
        return this.onHandshake(src, packet);
      case PacketType.Message:
        return this.onMessage(src, packet);
    }
  };

  /**
   * Send the request over the transport, storing the pending request
   */
  private processRequest(dstId: NodeId, dst: Multiaddr, packet: IPacket, message?: RequestMessage): void {
    const dstStr = dst.toString();
    const request: IPendingRequest = {
      dstId,
      dst,
      packet,
      message,
      retries: 1,
    };
    this.transport.send(dst, dstId, packet);
    let requests = this.pendingRequests.get(dstStr);
    if (!requests) {
      requests = new TimeoutMap(this.config.requestTimeout, this.onPendingRequestTimeout);
      this.pendingRequests.set(dstStr, requests);
    }
    requests.set(message ? message.id : 0n, request);
  }

  /**
   * Encrypts and sends any messages (for a specific destination) that were waiting for a session to be established
   */
  private flushMessages(dstId: NodeId, dst: Multiaddr): void {
    const session = this.sessions.get(dstId);
    if (!session || !session.trustedEstablished()) {
      // No adequate session
      return;
    }

    const messages = this.pendingMessages.get(dstId) || [];
    this.pendingMessages.delete(dstId);
    messages.forEach((message) => {
      log("Sending cached message");
      const packet = session.encryptMessage(this.enr.nodeId, dstId, encode(message));
      this.processRequest(dstId, dst, packet, message);
    });
  }

  /**
   * Remove timed-out requests
   */
  private onPendingRequestTimeout = (requestId: RequestId, request: IPendingRequest): void => {
    const dstId = request.dstId;
    const session = this.sessions.get(dstId);
    if (request.retries >= this.config.requestRetries) {
      if (
        !session ||
        session.state.state === SessionState.WhoAreYouSent ||
        session.state.state === SessionState.RandomSent
      ) {
        // no response from peer, flush all pending messages and drop session
        log("Session couldn't be established with node: %s at %s", dstId, request.dst.toString());
        const pendingMessages = this.pendingMessages.get(dstId);
        if (pendingMessages) {
          this.pendingMessages.delete(dstId);
          pendingMessages.forEach((message) => this.emit("requestFailed", request.dstId, message.id));
        }
        // drop the session
        this.sessions.delete(dstId);
      } else if (
        request.packet.header.flag === PacketType.Handshake ||
        request.packet.header.flag === PacketType.Message
      ) {
        log("Message timed out with node: %s", dstId);
        this.emit("requestFailed", request.dstId, requestId);
      }
    } else {
      // Increment the request retry count and restart the timeout
      log("Resending message: %O to node: %s", request.message, dstId);
      this.transport.send(request.dst, request.dstId, request.packet);
      request.retries += 1;
      const dstStr = request.dst.toString();
      let requests = this.pendingRequests.get(dstStr);
      if (!requests) {
        requests = new TimeoutMap(this.config.requestTimeout, this.onPendingRequestTimeout);
        this.pendingRequests.set(dstStr, requests);
      }
      requests.set(requestId, request);
    }
  };

  /**
   * Handle timed-out sessions
   * Only drop a session if we are not expecting any responses.
   */
  private onSessionTimeout = (nodeId: NodeId, session: Session): void => {
    for (const pendingRequests of this.pendingRequests.values()) {
      if (Array.from(pendingRequests.values()).find((request) => request.dstId === nodeId)) {
        this.sessions.setWithTimeout(nodeId, session, this.config.requestTimeout);
        return;
      }
    }
    // No pending requests for nodeId
    // Fail all pending messages for this node
    (this.pendingMessages.get(nodeId) || []).forEach((message) => this.emit("requestFailed", nodeId, message.id));
    this.pendingMessages.delete(nodeId);
    log("Session timed out for node: %s", nodeId);
  };
}
