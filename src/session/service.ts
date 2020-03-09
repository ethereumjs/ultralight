import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";

import { ITransportService, ISocketAddr } from "../transport";
import { PacketType, Packet, IWhoAreYouPacket, IAuthMessagePacket, IMessagePacket, AuthTag } from "../packet";
import { ENR, NodeIdHex, getUDPSocketAddr, getTag, NodeId, getSrcId } from "../enr";
import { Session } from "./session";
import { IKeypair } from "../keypair";
import { TimeoutMap, toHex, fromHex } from "../util";
import { Message, RequestMessage, encode, decode, ResponseMessage, RequestId } from "../message";
import { IPendingRequest, SessionState, ISessionEvents } from "./types";
import { SESSION_TIMEOUT, REQUEST_TIMEOUT, REQUEST_RETRIES } from "./constants";

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
  private enr: ENR;
  /**
   * The keypair to sign the ENR and set up encrypted communication with peers
   */
  private keypair: IKeypair;
  /**
   * The underlying packet transport
   */
  private transport: ITransportService;
  /**
   * Pending raw requests
   * A collection of request objects we are awaiting a response from the remote.
   * These are indexed by ISocketAddr as WHOAREYOU packets do not return a source node id to
   * match against.
   * We need to keep pending requests for sessions not yet fully connected.
   */
  private pendingRequests: Map<ISocketAddr, TimeoutMap<RequestId, IPendingRequest>>;
  /**
   * Messages awaiting to be sent once a handshake has been established
   */
  private pendingMessages: Map<NodeIdHex, RequestMessage[]>;
  /**
   * Sessions that have been created for each node id. These can be established or
   * awaiting response from remote nodes
   */
  private sessions: TimeoutMap<NodeIdHex, Session>;

  constructor(enr: ENR, keypair: IKeypair, transport: ITransportService) {
    super();
    this.enr = enr;
    this.keypair = keypair;
    this.transport = transport;
    this.pendingRequests = new Map();
    this.pendingMessages = new Map();
    this.sessions = new TimeoutMap(SESSION_TIMEOUT, this.onSessionTimeout);
  }

  /**
   * Starts the session service, starting the underlying UDP transport service.
   */
  public async start(): Promise<void> {
    this.transport.on("packet", this.onPacket);
    await this.transport.start();
  }

  /**
   * Closes the session service, stopping the underlying UDP transport service.
   */
  public async close(): Promise<void> {
    this.transport.removeListener("packet", this.onPacket);
    await this.transport.close();
    for (const requestMap of this.pendingRequests.values()) {
      requestMap.clear();
    }
    this.pendingRequests.clear();
    this.pendingMessages.clear();
    this.sessions.clear();
  }

  public onWhoAreYou(from: ISocketAddr, packet: IWhoAreYouPacket): void {
    const pendingRequests = this.pendingRequests.get(from);
    if (!pendingRequests) {
      // Received a WHOAREYOU packet that references an unknown or expired request.
      return;
    }
    const request = Array.from(pendingRequests.values()).find((r) =>
      packet.token.equals((r.packet as IMessagePacket).authTag || Buffer.alloc(0)));
    if (!request) {
      // Received a WHOAREYOU packet that references an unknown or expired request.
      return;
    }
    if (pendingRequests.size === 1) {
      this.pendingRequests.delete(from);
    } else {
      pendingRequests.delete(request.message ? request.message.id : 0n);
    }

    // This is an assumed NodeId. We sent the packet to this NodeId and can only verify it against the
    // originating IP address. We assume it comes from this NodeId.
    const srcId = request.dstId;
    const srcIdHex = toHex(srcId);
    const tag = getTag(this.enr, srcId);

    const session = this.sessions.get(srcIdHex);
    if (!session) {
      // Received a WhoAreYou packet without having an established session
      return;
    }

    // Determine which message to send back. A WhoAreYou could refer to the random packet
    // sent during establishing a connection, or their session has expired on one of our
    // send messages and we need to re-encrypt it
    let message: RequestMessage;
    if (request.packet.type === PacketType.Random) {
      // get the messages that are waiting for an established session
      const messages = this.pendingMessages.get(srcIdHex);
      if (!messages || !messages.length) {
        throw new Error("No pending messages found for WHOAREYOU request.");
      }
      message = messages.shift() as RequestMessage;
      this.pendingMessages.set(srcIdHex, messages);
    } else {
      if (!request.message) {
        throw new Error("All non-random requests must have an unencrypted message");
      }
      // re-send the original message
      message = request.message as RequestMessage;
    }
    // Update the session (this must be the socket that we sent the referenced request to)
    session.lastSeenSocket = from;

    // Update the ENR record if necessary
    let updatedEnr: ENR | null = null;
    if (packet.enrSeq < this.enr.seq) {
      updatedEnr = this.enr;
    }

    // Generate session keys and encrypt the earliest packet with the authentication header
    try {
      const authPacket = session.encryptWithHeader(
        tag,
        this.keypair,
        updatedEnr,
        this.enr.nodeId,
        packet.idNonce,
        encode(message)
      );

      // send the response
      this.processRequest(srcId, from, authPacket, message);

      // flush the message cache
      this.flushMessages(srcId, from);
    } catch (e) {
      // insert the message back into the pending queue
      let messages = this.pendingMessages.get(srcIdHex);
      if (!messages) {
        messages = [];
      }
      messages.unshift(message);
      this.pendingMessages.set(srcIdHex, messages);
      throw new Error("Could not generate a session");
    }
  }

  public onAuthMessage(from: ISocketAddr, packet: IAuthMessagePacket): void {
    // Needs to match an outgoing WHOAREYOU packet (so we have the required nonce to be signed).
    // If it doesn't we drop the packet.
    // This will lead to future outgoing WHOAREYOU packets if they proceed to send further encrypted packets
    const srcId = getSrcId(this.enr, packet.tag);
    const srcIdHex = toHex(srcId);

    const session = this.sessions.get(srcIdHex);
    if (!session) {
      throw new Error("Received an authenticated header without a known session");
    }

    if (session.state.state !== SessionState.WhoAreYouSent) {
      throw new Error("Received an authenticated header without a known WHOAREYOU session");
    }

    const pendingRequests = this.pendingRequests.get(from);
    if (!pendingRequests) {
      throw new Error("Received an authenticated header without a matching WHOAREYOU request");
    }
    const request = Array.from(pendingRequests.values()).find((r) =>
      r.packet.type === PacketType.WhoAreYou && r.dstId.equals(srcId));
    if (!request) {
      throw new Error("Received an authenticated header without a matching WHOAREYOU request");
    }
    if (pendingRequests.size === 1) {
      this.pendingRequests.delete(from);
    } else {
      pendingRequests.delete(request.message ? request.message.id : 0n);
    }

    const idNonce = (request.packet as IWhoAreYouPacket).idNonce;

    // update the sessions last seen socket
    session.lastSeenSocket = from;

    // establish the session
    try {
      const trusted = session.establishFromHeader(this.keypair, this.enr.nodeId, srcId, idNonce, packet.authHeader);
      if (trusted) {
        // session is trusted, notify the protocol
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.emit("established", session.remoteEnr!);
        // flush messages
        this.flushMessages(srcId, from);
      }
    } catch (e) {
      this.sessions.delete(srcIdHex);
      this.pendingMessages.delete(srcIdHex);
      throw new Error("Invalid Authentication header. Dropping session.");
    }

    // session has been established, update the timeout
    this.sessions.setTimeout(srcIdHex, SESSION_TIMEOUT);

    // decrypt the message
    this.onMessage(
      from,
      {
        type: PacketType.Message,
        authTag: packet.authHeader.authTag,
        message: packet.message,
        tag: packet.tag,
      }
    );
  }

  public onMessage(from: ISocketAddr, packet: IMessagePacket): void {
    const srcId = getSrcId(this.enr, packet.tag);
    const srcIdHex = toHex(srcId);

    // check if we have an available session
    const session = this.sessions.get(srcIdHex);
    if (!session) {
      // Received a message without a session.

      // spawn a WHOAREYOU event to check for highest known ENR
      this.emit("whoAreYouRequest", srcId, from, packet.authTag);
      throw new Error();
    }
    // if we have sent a random packet, upgrade to a WHOAREYOU request
    if (session.state.state === SessionState.RandomSent) {
      this.emit("whoAreYouRequest", srcId, from, packet.authTag);
    } else if (session.state.state === SessionState.WhoAreYouSent) {
      // Waiting for a session to be generated

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
      encodedMessage = session.decryptMessage(packet.authTag, packet.message, packet.tag);
    } catch (e) {
      // We have a session but the message could not be decrypted.
      // It is likely the node sending this message has dropped their session.
      // In this case, this message is a random packet and we should reply with a WHOAREYOU.
      // This means we need to drop the current session and re-establish.
      this.sessions.delete(srcIdHex);
      this.emit("whoAreYouRequest", srcId, from, packet.authTag);
      return;
    }
    let message: Message;
    try {
      message = decode(encodedMessage);
    } catch (e) {
      throw new Error(`Failed to decode message. Error: ${e.message}`);
    }

    // Remove any associated request from pendingRequests
    const pendingRequests = this.pendingRequests.get(from);
    if (pendingRequests) {
      pendingRequests.delete(message.id);
    }

    // We have received a new message. Notify the protocol
    this.emit("message", srcId, from, message);

    // update the lastSeenSocket and check if we need to promote the sesison to trusted
    session.lastSeenSocket = from;

    // There are two possibilities as session could have been established.
    // The lastest message matches the known ENR and upgrades the session to an established state,
    // or, we were awaiting a message to be decrypted with new session keys,
    // this just arrived and now we consider the session established.
    // In both cases, we notify the user and fllush the cahced messages
    if (
      (session.updateTrusted() &&  session.trustedEstablished()) ||
      (session.trustedEstablished() && sessionWasAwaiting)
    ) {
      // session has been established, notify the protocol
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.emit("established", session.remoteEnr!);
      // flush messages
      this.flushMessages(srcId, from);
    }
  }
  public onPacket = (src: ISocketAddr, packet: Packet): void => {
    switch (packet.type) {
      case PacketType.WhoAreYou:
        return this.onWhoAreYou(src, packet as IWhoAreYouPacket);
      case PacketType.AuthMessage:
        return this.onAuthMessage(src, packet as IAuthMessagePacket);
      case PacketType.Message:
        return this.onMessage(src, packet as IMessagePacket);
    }
  };

  public updateEnr(enr: ENR): void {
    const session = this.sessions.get(toHex(enr.nodeId));
    if (session) {
      if (session.updateEnr(enr)) {
        // A session has be been promited to established.
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
    const dstIdHex = toHex(dstId);
    const dst = getUDPSocketAddr(dstEnr);
    const session = this.sessions.get(dstIdHex);
    if (!session) {
      // cache message
      const msgs = this.pendingMessages.get(dstIdHex);
      if (msgs) {
        msgs.push(message);
      } else {
        this.pendingMessages.set(dstIdHex, [message]);
      }
      // need to establish a new session, send a random packet
      const [session, packet] = Session.createWithRandom(getTag(this.enr, dstId), dstEnr);
      this.processRequest(dstId, dst, packet, message);
      this.sessions.set(toHex(dstId), session);
      return;
    }
    if (!session.trustedEstablished()) {
      throw new Error("Session is being established, request failed");
    }
    if (!session.isTrusted()) {
      throw new Error("Tried to send a request to an untrusted node");
    }
    // encrypt the message and send
    const packet = session.encryptMessage(getTag(this.enr, dstId), encode(message));
    this.processRequest(dstId, dst, packet, message);
  }

  /**
   * Similar to `sendRequest` but for requests which an ENR may be unknown.
   * A session is therefore assumed to be valid
   */
  public sendRequestUnknownEnr(dst: ISocketAddr, dstId: NodeId, message: RequestMessage): void {
    // session should be established
    const session = this.sessions.get(toHex(dstId));
    if (!session) {
      throw new Error("Session not established");
    }

    const packet = session.encryptMessage(getTag(this.enr, dstId), encode(message));
    this.processRequest(dstId, dst, packet, message);
  }

  /**
   * Sends a response
   * This differs from `sendRequest` as responses do not require a known ENR to send messages
   * and sessions should already be established
   */
  public sendResponse(dst: ISocketAddr, dstId: NodeId, message: ResponseMessage): void {
    // session should be established
    const session = this.sessions.get(toHex(dstId));
    if (!session) {
      throw new Error("Session not established");
    }
    const packet = session.encryptMessage(getTag(this.enr, dstId), encode(message));
    this.transport.send(dst, packet);
  }

  public sendWhoAreYou(dst: ISocketAddr, dstId: NodeId, enrSeq: bigint, remoteEnr: ENR, authTag: AuthTag): void {
    const dstIdHex = toHex(dstId);
    // _session will be overwritten if not trusted-established or state.whoareyousent
    const _session = this.sessions.get(dstIdHex);
    if (_session) {
      // If a WHOAREYOU is already sent or a session is already established, ignore this request
      if (_session.trustedEstablished() || _session.state.state === SessionState.WhoAreYouSent) {
        // session exists, WhoAreYou packet not sent
        return;
      }
    }
    const [session, packet] = Session.createWithWhoAreYou(dstId, enrSeq, remoteEnr, authTag);
    this.sessions.set(dstIdHex, session);
    this.processRequest(dstId, dst, packet);
  }

  private processRequest(dstId: NodeId, dst: ISocketAddr, packet: Packet, message?: RequestMessage): void {
    const request: IPendingRequest = {
      dstId,
      dst,
      packet,
      message,
      retries: 1,
    };
    this.transport.send(dst, packet);
    let requests = this.pendingRequests.get(dst);
    if (!requests) {
      requests = new TimeoutMap(REQUEST_TIMEOUT, this.onPendingRequestTimeout);
      this.pendingRequests.set(dst, requests);
    }
    requests.set(message ? message.id : 0n, request);
  }

  /**
   * Encrypts and sends any messages (for a specific destination) that were waiting for a session to be established
   */
  private flushMessages(dstId: NodeId, dst: ISocketAddr): void {
    const dstIdHex = toHex(dstId);
    const session = this.sessions.get(dstIdHex);
    if (!session || !session.trustedEstablished()) {
      // No adequate session
      return;
    }
    const tag = getTag(this.enr, dstId);

    const messages = this.pendingMessages.get(dstIdHex) || [];
    this.pendingMessages.delete(dstIdHex);
    messages.forEach((message) => {
      const packet = session.encryptMessage(tag, encode(message));
      this.processRequest(dstId, dst, packet, message);
    });
  }

  /**
   * Remove timed-out requests
   */
  private onPendingRequestTimeout = (requestId: RequestId, request: IPendingRequest): void => {
    if (request.retries >= REQUEST_RETRIES) {
      const dstIdHex = toHex(request.dstId);
      if (request.packet.type === PacketType.Random || request.packet.type === PacketType.WhoAreYou) {
        // no response from peer, flush all pending messages and drop session
        const pendingMessages = this.pendingMessages.get(dstIdHex);
        if (pendingMessages) {
          this.pendingMessages.delete(dstIdHex);
          pendingMessages.forEach((message) =>
            this.emit("requestFailed", request.dstId, message.id));
        }
        this.sessions.delete(dstIdHex);
      } else if (request.packet.type === PacketType.AuthMessage || request.packet.type === PacketType.Message) {
        this.emit("requestFailed", request.dstId, requestId);
      }
    } else {
      // Increment the request retry count and restart the timeout
      this.transport.send(request.dst, request.packet);
      request.retries += 1;
      let requests = this.pendingRequests.get(request.dst);
      if (!requests) {
        requests = new TimeoutMap(REQUEST_TIMEOUT, this.onPendingRequestTimeout);
        this.pendingRequests.set(request.dst, requests);
      }
      requests.set(requestId, request);
    }
  };

  /**
   * Handle timed-out sessions
   * Only drop a session if we are not expecting any responses.
   */
  private onSessionTimeout = (nodeIdHex: NodeIdHex, session: Session): void => {
    const nodeId = fromHex(nodeIdHex);
    for (const pendingRequests of this.pendingRequests.values()) {
      if (Array.from(pendingRequests.values()).find((request) => request.dstId.equals(nodeId))) {
        this.sessions.setWithTimeout(nodeIdHex, session, REQUEST_TIMEOUT);
        return;
      }
    }
    // No pending requests for nodeId
    // Fail all pending messages for this node
    (this.pendingMessages.get(nodeIdHex) || [])
      .forEach((message) => this.emit("requestFailed", nodeId, message.id));
    this.pendingMessages.delete(nodeIdHex);
  };
}
