/// <reference types="node" />
import { Multiaddr } from "multiaddr";
import { NodeId, ENR, SequenceNumber } from "../enr";
import { TrustedState, ISessionState } from "./types";
import { IHandshakeAuthdata, IPacket } from "../packet";
import { IKeypair } from "../keypair";
interface ISessionOpts {
    state: ISessionState;
    trusted: TrustedState;
    remoteEnr?: ENR;
    lastSeenMultiaddr: Multiaddr;
}
/**
 * Manages active handshakes and connections between nodes in discv5.
 * There are three main states a session can be in,
 *  Initializing (`WhoAreYouSent` or `RandomSent`),
 *  Untrusted (when the socket address of the ENR doesn't match the `lastSeenSocket`) and
 *  Established (the session has been successfully established).
 */
export declare class Session {
    /**
     * The current state of the Session
     */
    state: ISessionState;
    /**
     * Whether the last seen socket address of the peer matches its known ENR.
     * If it does not, the session is considered untrusted, and outgoing messages are not sent.
     */
    trusted: TrustedState;
    /**
     * The ENR of the remote node. This may be unknown during `WhoAreYouSent` states.
     */
    remoteEnr: ENR | null | undefined;
    /**
     * Last seen IP address and port. This is used to determine if the session is trusted or not.
     */
    lastSeenMultiaddr: Multiaddr;
    /**
     * The delay when this session expires
     */
    timeout: number;
    constructor({ state, trusted, remoteEnr, lastSeenMultiaddr }: ISessionOpts);
    /**
     * Creates a new `Session` instance and generates a RANDOM packet to be sent along with this
     * session being established. This session is set to `RandomSent` state.
     */
    static createWithRandom(localId: NodeId, remoteEnr: ENR): [Session, IPacket];
    /**
     * Creates a new `Session` and generates an associated WHOAREYOU packet.
     * The returned session is in the `WhoAreYouSent` state.
     */
    static createWithWhoAreYou(nonce: Buffer, enrSeq: SequenceNumber, remoteEnr: ENR | null): [Session, IPacket];
    /**
     * Generates session keys from a handshake authdata.
     * If the IP of the ENR does not match the source IP address, the session is considered untrusted.
     * The output returns a boolean which specifies if the Session is trusted or not.
     */
    establishFromHandshake(kpriv: IKeypair, localId: NodeId, remoteId: NodeId, authdata: IHandshakeAuthdata): boolean;
    /**
     * Encrypts a message and produces an handshake packet.
     */
    encryptWithHandshake(kpriv: IKeypair, challengeData: Buffer, srcId: NodeId, updatedEnr: Buffer | null, message: Buffer): IPacket;
    /**
     * Uses the current `Session` to encrypt a message.
     * Encrypt packets with the current session key if we are awaiting a response from an
     * IAuthMessagePacket.
     */
    encryptMessage(srcId: NodeId, destId: NodeId, message: Buffer): IPacket;
    /**
     * Decrypts an encrypted message.
     * If a Session is already established, the original decryption keys are tried first,
     * upon failure, the new keys are attempted. If the new keys succeed,
     * the session keys are updated along with the Session state.
     */
    decryptMessage(nonce: Buffer, message: Buffer, aad: Buffer): Buffer;
    /**
     * Returns true if the Session has been promoted
     */
    updateEnr(enr: ENR): boolean;
    /**
     * Updates the trusted status of a Session.
     * It can be promoted to an `established` state, or demoted to an `untrusted` state.
     * This value returns true if the Session has been promoted.
     */
    updateTrusted(): boolean;
    isTrusted(): boolean;
    /**
     * Returns true if the Session is trusted and has established session keys.
     * This state means the session is capable of sending requests.
     */
    trustedEstablished(): boolean;
}
export {};
