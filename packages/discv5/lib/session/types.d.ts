/// <reference types="node" />
import { Multiaddr } from "multiaddr";
import { NodeId, ENR } from "../enr";
import { IPacket } from "../packet";
import { Message, RequestMessage } from "../message";
export interface ISessionConfig {
    /**
     * The timeout for each UDP request
     * defined in milliseconds
     */
    requestTimeout: number;
    /**
     * The number of retries for each UDP request
     */
    requestRetries: number;
    /**
     * The session timeout for each node
     * defined in milliseconds
     */
    sessionTimeout: number;
    /**
     * The timeout for session establishment
     * defined in milliseconds
     */
    sessionEstablishTimeout: number;
}
export declare enum SessionState {
    /**
     * A WHOAREYOU packet has been sent, and the Session is awaiting an Authentication response.
     */
    WhoAreYouSent = 0,
    /**
     * A RANDOM packet has been sent and the Session is awaiting a WHOAREYOU response.
     */
    RandomSent = 1,
    /**
     * An AuthMessage has been sent with a new set of generated keys. Once a response has been
     * received that we can decrypt, the session transitions to an established state, replacing
     * any current set of keys. No Session is currently active.
     */
    AwaitingResponse = 2,
    /**
     * An established Session has received a WHOAREYOU. In this state, messages are sent
     * out with the established sessions keys and new encrypted messages are first attempted to
     * be decrypted with the established session keys, upon failure, the new keys are tried. If
     * the new keys are successful, the session keys are updated and the state progresses to
     * `Established`
     */
    EstablishedAwaitingResponse = 3,
    /**
     * A Session has been established and the ENR IP matches the source IP.
     */
    Established = 4,
    /**
     * Processing has failed. Fatal error.
     */
    Poisoned = 5
}
export interface IKeys {
    encryptionKey: Buffer;
    decryptionKey: Buffer;
}
/**
 * Wrapper interface for Session state
 * We maintain 0, 1, or 2 keys depending on the state
 */
export declare type ISessionState = {
    state: SessionState.WhoAreYouSent;
    challengeData: Buffer;
} | {
    state: SessionState.RandomSent;
} | {
    state: SessionState.Poisoned;
} | {
    state: SessionState.AwaitingResponse;
    currentKeys: IKeys;
} | {
    state: SessionState.Established;
    currentKeys: IKeys;
} | {
    state: SessionState.EstablishedAwaitingResponse;
    currentKeys: IKeys;
    newKeys: IKeys;
};
export declare enum TrustedState {
    /**
     * The ENR socket address matches what is observed
     */
    Trusted = 0,
    /**
     * The source socket address of the last message doesn't match the known ENR.
     * In this state, the service will respond to requests, but does not treat the node as
     * connected until the IP is updated to match the source IP.
     */
    Untrusted = 1
}
/**
 * A request to a node that we are waiting for a response
 */
export interface IPendingRequest {
    /**
     * The destination NodeId
     */
    dstId: NodeId;
    /**
     * The destination Multiaddr
     */
    dst: Multiaddr;
    /**
     * The raw packet sent
     */
    packet: IPacket;
    /**
     * The unencrypted message. Required if we need to re-encrypt and re-send
     */
    message?: RequestMessage;
    /**
     * The number if times this request has been re-sent
     */
    retries: number;
}
export interface ISessionEvents {
    /**
     * A session has been established with a node
     */
    established: (enr: ENR) => void;
    /**
     * A message was received
     */
    message: (srcId: NodeId, src: Multiaddr, message: Message) => void;
    /**
     * A WHOAREYOU packet needs to be sent.
     * This requests the protocol layer to send back the highest known ENR.
     */
    whoAreYouRequest: (srcId: NodeId, src: Multiaddr, nonce: Buffer) => void;
    /**
     * An RPC request failed.
     */
    requestFailed: (srcId: NodeId, rpcId: bigint) => void;
}
