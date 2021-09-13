/// <reference types="node" />
import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { Multiaddr } from "multiaddr";
import { ITransportService } from "../transport";
import { IPacket } from "../packet";
import { ENR, NodeId } from "../enr";
import { IKeypair } from "../keypair";
import { RequestMessage, ResponseMessage } from "../message";
import { ISessionEvents, ISessionConfig } from "./types";
declare const SessionService_base: new () => StrictEventEmitter<EventEmitter, ISessionEvents>;
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
export declare class SessionService extends SessionService_base {
    /**
     * The local ENR
     */
    enr: ENR;
    /**
     * The keypair to sign the ENR and set up encrypted communication with peers
     */
    keypair: IKeypair;
    /**
     * The underlying packet transport
     */
    transport: ITransportService;
    /**
     * Configuration
     */
    private config;
    /**
     * Pending raw requests
     * A collection of request objects we are awaiting a response from the remote.
     * These are indexed by multiaddr string as WHOAREYOU packets do not return a source node id to
     * match against.
     * We need to keep pending requests for sessions not yet fully connected.
     */
    private pendingRequests;
    /**
     * Messages awaiting to be sent once a handshake has been established
     */
    private pendingMessages;
    /**
     * Sessions that have been created for each node id. These can be established or
     * awaiting response from remote nodes
     */
    private sessions;
    constructor(config: ISessionConfig, enr: ENR, keypair: IKeypair, transport: ITransportService);
    /**
     * Starts the session service, starting the underlying transport service.
     */
    start(): Promise<void>;
    /**
     * Stops the session service, stopping the underlying transport service.
     */
    stop(): Promise<void>;
    sessionsSize(): number;
    updateEnr(enr: ENR): void;
    /**
     * Sends an RequestMessage request to a known ENR.
     * It is possible to send requests to IP addresses not related to the ENR.
     */
    sendRequest(dstEnr: ENR, message: RequestMessage): void;
    /**
     * Similar to `sendRequest` but for requests which an ENR may be unknown.
     * A session is therefore assumed to be valid
     */
    sendRequestUnknownEnr(dst: Multiaddr, dstId: NodeId, message: RequestMessage): void;
    /**
     * Sends a response
     * This differs from `sendRequest` as responses do not require a known ENR to send messages
     * and sessions should already be established
     */
    sendResponse(dst: Multiaddr, dstId: NodeId, message: ResponseMessage): void;
    sendWhoAreYou(dst: Multiaddr, dstId: NodeId, enrSeq: bigint, remoteEnr: ENR | null, nonce: Buffer): void;
    onWhoAreYou(src: Multiaddr, packet: IPacket): void;
    onHandshake(src: Multiaddr, packet: IPacket): void;
    onMessage(src: Multiaddr, packet: IPacket): void;
    onPacket: (src: Multiaddr, packet: IPacket) => void;
    /**
     * Send the request over the transport, storing the pending request
     */
    private processRequest;
    /**
     * Encrypts and sends any messages (for a specific destination) that were waiting for a session to be established
     */
    private flushMessages;
    /**
     * Remove timed-out requests
     */
    private onPendingRequestTimeout;
    /**
     * Handle timed-out sessions
     * Only drop a session if we are not expecting any responses.
     */
    private onSessionTimeout;
}
export {};
