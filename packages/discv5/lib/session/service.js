"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const transport_1 = require("../transport");
const packet_1 = require("../packet");
const session_1 = require("./session");
const util_1 = require("../util");
const message_1 = require("../message");
const types_1 = require("./types");
const log = debug_1.default("discv5:sessionService");
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
class SessionService extends events_1.EventEmitter {
    constructor(config, enr, keypair, transport) {
        super();
        this.onPacket = (src, packet) => {
            log("packet received from ", src.toString());
            switch (packet.header.flag) {
                case packet_1.PacketType.WhoAreYou:
                    return this.onWhoAreYou(src, packet);
                case packet_1.PacketType.Handshake:
                    return this.onHandshake(src, packet);
                case packet_1.PacketType.Message:
                    return this.onMessage(src, packet);
            }
        };
        /**
         * Remove timed-out requests
         */
        this.onPendingRequestTimeout = (requestId, request) => {
            const dstId = request.dstId;
            const session = this.sessions.get(dstId);
            if (request.retries >= this.config.requestRetries) {
                if (!session ||
                    session.state.state === types_1.SessionState.WhoAreYouSent ||
                    session.state.state === types_1.SessionState.RandomSent) {
                    // no response from peer, flush all pending messages and drop session
                    log("Session couldn't be established with node: %s at %s", dstId, request.dst.toString());
                    const pendingMessages = this.pendingMessages.get(dstId);
                    if (pendingMessages) {
                        this.pendingMessages.delete(dstId);
                        pendingMessages.forEach((message) => this.emit("requestFailed", request.dstId, message.id));
                    }
                    // drop the session
                    this.sessions.delete(dstId);
                }
                else if (request.packet.header.flag === packet_1.PacketType.Handshake ||
                    request.packet.header.flag === packet_1.PacketType.Message) {
                    log("Message timed out with node: %s", dstId);
                    this.emit("requestFailed", request.dstId, requestId);
                }
            }
            else {
                // Increment the request retry count and restart the timeout
                log("Resending message: %O to node: %s", request.message, dstId);
                this.transport.send(request.dst, request.dstId, request.packet);
                request.retries += 1;
                const dstStr = request.dst.toString();
                let requests = this.pendingRequests.get(dstStr);
                if (!requests) {
                    requests = new util_1.TimeoutMap(this.config.requestTimeout, this.onPendingRequestTimeout);
                    this.pendingRequests.set(dstStr, requests);
                }
                requests.set(requestId, request);
            }
        };
        /**
         * Handle timed-out sessions
         * Only drop a session if we are not expecting any responses.
         */
        this.onSessionTimeout = (nodeId, session) => {
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
        this.sessions = new util_1.TimeoutMap(this.config.sessionTimeout, this.onSessionTimeout);
    }
    /**
     * Starts the session service, starting the underlying transport service.
     */
    async start() {
        log(`Starting session service with node id ${this.enr.nodeId}`);
        this.transport.on("packet", this.onPacket);
        this.transport.on("decodeError", (err, ma) => log("Error processing packet", err, ma));
        await this.transport.start();
    }
    /**
     * Stops the session service, stopping the underlying transport service.
     */
    async stop() {
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
    sessionsSize() {
        return this.sessions.size;
    }
    updateEnr(enr) {
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
    sendRequest(dstEnr, message) {
        const dstId = dstEnr.nodeId;
        const transport = this.transport instanceof transport_1.WebSocketTransportService ? "udp" : "udp";
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
            }
            else {
                this.pendingMessages.set(dstId, [message]);
            }
            // need to establish a new session, send a random packet
            const [session, packet] = session_1.Session.createWithRandom(this.enr.nodeId, dstEnr);
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
        const packet = session.encryptMessage(this.enr.nodeId, dstId, message_1.encode(message));
        this.processRequest(dstId, dst, packet, message);
    }
    /**
     * Similar to `sendRequest` but for requests which an ENR may be unknown.
     * A session is therefore assumed to be valid
     */
    sendRequestUnknownEnr(dst, dstId, message) {
        // session should be established
        const session = this.sessions.get(dstId);
        if (!session) {
            throw new Error("Request without an ENR could not be sent, no session exists");
        }
        log("Sending request w/o ENR: %O to %s on %s", message, dstId, dst.toString());
        const packet = session.encryptMessage(this.enr.nodeId, dstId, message_1.encode(message));
        this.processRequest(dstId, dst, packet, message);
    }
    /**
     * Sends a response
     * This differs from `sendRequest` as responses do not require a known ENR to send messages
     * and sessions should already be established
     */
    sendResponse(dst, dstId, message) {
        // session should be established
        const session = this.sessions.get(dstId);
        if (!session) {
            throw new Error("Response could not be sent, no session exists");
        }
        log("Sending %s response to %s at %s", message_1.MessageType[message.type], dstId, dst.toString());
        const packet = session.encryptMessage(this.enr.nodeId, dstId, message_1.encode(message));
        this.transport.send(dst, dstId, packet);
    }
    sendWhoAreYou(dst, dstId, enrSeq, remoteEnr, nonce) {
        // _session will be overwritten if not trusted-established or state.whoareyousent
        const _session = this.sessions.get(dstId);
        if (_session) {
            // If a WHOAREYOU is already sent or a session is already established, ignore this request
            if (_session.trustedEstablished() || _session.state.state === types_1.SessionState.WhoAreYouSent) {
                // session exists, WhoAreYou packet not sent
                log("Session exists, WHOAREYOU packet not sent");
                return;
            }
        }
        log("Sending WHOAREYOU to: %s on %s", dstId, dst.toString());
        const [session, packet] = session_1.Session.createWithWhoAreYou(nonce, enrSeq, remoteEnr);
        this.sessions.set(dstId, session);
        this.processRequest(dstId, dst, packet);
    }
    onWhoAreYou(src, packet) {
        let authdata;
        try {
            authdata = packet_1.decodeWhoAreYouAuthdata(packet.header.authdata);
        }
        catch (e) {
            log("Cannot decode WHOAREYOU authdata from %s: %s", src.toString(), e);
            return;
        }
        const nonce = packet.header.nonce;
        const srcStr = src.toString();
        const pendingRequests = this.pendingRequests.get(srcStr);
        if (!pendingRequests) {
            // Received a WHOAREYOU packet that references an unknown or expired request.
            log("Received a WHOAREYOU packet that references an unknown or expired request - no pending requests. source: %s, token: %s", srcStr, nonce.toString("hex"));
            return;
        }
        const request = Array.from(pendingRequests.values()).find((r) => nonce.equals(r.packet.header.nonce));
        if (!request) {
            // Received a WHOAREYOU packet that references an unknown or expired request.
            log("Received a WHOAREYOU packet that references an unknown or expired request - nonce not found. source: %s, token: %s", srcStr, nonce.toString("hex"));
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
        let message;
        if (session.state.state === types_1.SessionState.RandomSent) {
            // get the messages that are waiting for an established session
            const messages = this.pendingMessages.get(srcId);
            if (!messages || !messages.length) {
                log("No pending messages found for WHOAREYOU request.");
                return;
            }
            message = messages.shift();
            this.pendingMessages.set(srcId, messages);
        }
        else {
            // re-send the original message
            if (!request.message) {
                log("All non-random requests must have an unencrypted message");
                return;
            }
            message = request.message;
        }
        // Update the session (this must be the socket that we sent the referenced request to)
        session.lastSeenMultiaddr = src;
        // Update the ENR record if necessary
        let updatedEnr = null;
        if (authdata.enrSeq < this.enr.seq) {
            updatedEnr = this.enr.encode(this.keypair.privateKey);
        }
        // Generate session keys and encrypt the earliest packet in a handshake packet
        let handshakePacket;
        try {
            handshakePacket = session.encryptWithHandshake(this.keypair, packet_1.encodeChallengeData(packet.maskingIv, packet.header), this.enr.nodeId, updatedEnr, message_1.encode(message));
        }
        catch (e) {
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
    onHandshake(src, packet) {
        const srcStr = src.toString();
        // Needs to match an outgoing WHOAREYOU packet (so we have the required nonce to be signed).
        // If it doesn't we drop the packet.
        // This will lead to future outgoing WHOAREYOU packets if they proceed to send further encrypted packets
        let authdata;
        try {
            authdata = packet_1.decodeHandshakeAuthdata(packet.header.authdata);
        }
        catch (e) {
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
        if (session.state.state !== types_1.SessionState.WhoAreYouSent) {
            log("Received an authenticated header without a known WHOAREYOU session, dropping.");
            return;
        }
        const pendingRequests = this.pendingRequests.get(srcStr);
        if (!pendingRequests) {
            log("Received an authenticated header without a matching WHOAREYOU request, dropping.");
            return;
        }
        const request = Array.from(pendingRequests.values()).find((r) => r.packet.header.flag === packet_1.PacketType.WhoAreYou && r.dstId === srcId);
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
                this.emit("established", session.remoteEnr);
                // flush messages
                this.flushMessages(srcId, src);
            }
        }
        catch (e) {
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
            header: packet_1.createHeader(packet_1.PacketType.Message, packet_1.encodeMessageAuthdata({ srcId }), packet.header.nonce),
            message: packet.message,
            messageAd: packet_1.encodeChallengeData(packet.maskingIv, packet.header),
        });
    }
    onMessage(src, packet) {
        let authdata;
        try {
            authdata = packet_1.decodeMessageAuthdata(packet.header.authdata);
        }
        catch (e) {
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
        if (session.state.state === types_1.SessionState.RandomSent) {
            this.emit("whoAreYouRequest", srcId, src, packet.header.nonce);
        }
        else if (session.state.state === types_1.SessionState.WhoAreYouSent) {
            // Waiting for a session to be generated
            log("Waiting for a session to be generated. from: %s at %s", srcId, src);
            // potentially store and decrypt once we receive the packet
            // drop it for now
            return;
        }
        // We could be in the AwaitingResponse state. If so, this message could establish a new
        // session with a node. We keep track to see if the decryption uupdates the session. If so,
        // we notify the user and flush all cached messages.
        const sessionWasAwaiting = session.state.state === types_1.SessionState.AwaitingResponse;
        // attempt to decrypt and process the message
        let encodedMessage;
        try {
            encodedMessage = session.decryptMessage(packet.header.nonce, packet.message, packet.messageAd || packet_1.encodeChallengeData(packet.maskingIv, packet.header));
        }
        catch (e) {
            // We have a session but the message could not be decrypted.
            // It is likely the node sending this message has dropped their session.
            // In this case, this message is a random packet and we should reply with a WHOAREYOU.
            // This means we need to drop the current session and re-establish.
            log("Message from node: %s is not encrypted with known session keys. Requesting a WHOAREYOU packet", srcId);
            this.sessions.delete(srcId);
            this.emit("whoAreYouRequest", srcId, src, packet.header.nonce);
            return;
        }
        let message;
        try {
            message = message_1.decode(encodedMessage);
        }
        catch (e) {
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
        if ((session.updateTrusted() && session.trustedEstablished()) ||
            (session.trustedEstablished() && sessionWasAwaiting)) {
            // session has been established, notify the protocol
            log("Session established with node from updated: %s", srcId);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.emit("established", session.remoteEnr);
            // flush messages
            this.flushMessages(srcId, src);
        }
        // We have received a new message. Notify the protocol
        log("Message received: %s from: %s on %s", message_1.MessageType[message.type], srcId, src);
        this.emit("message", srcId, src, message);
    }
    /**
     * Send the request over the transport, storing the pending request
     */
    processRequest(dstId, dst, packet, message) {
        const dstStr = dst.toString();
        const request = {
            dstId,
            dst,
            packet,
            message,
            retries: 1,
        };
        this.transport.send(dst, dstId, packet);
        let requests = this.pendingRequests.get(dstStr);
        if (!requests) {
            requests = new util_1.TimeoutMap(this.config.requestTimeout, this.onPendingRequestTimeout);
            this.pendingRequests.set(dstStr, requests);
        }
        requests.set(message ? message.id : 0n, request);
    }
    /**
     * Encrypts and sends any messages (for a specific destination) that were waiting for a session to be established
     */
    flushMessages(dstId, dst) {
        const session = this.sessions.get(dstId);
        if (!session || !session.trustedEstablished()) {
            // No adequate session
            return;
        }
        const messages = this.pendingMessages.get(dstId) || [];
        this.pendingMessages.delete(dstId);
        messages.forEach((message) => {
            log("Sending cached message");
            const packet = session.encryptMessage(this.enr.nodeId, dstId, message_1.encode(message));
            this.processRequest(dstId, dst, packet, message);
        });
    }
}
exports.SessionService = SessionService;
