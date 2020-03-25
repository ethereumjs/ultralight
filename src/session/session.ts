import assert = require("assert");
import Multiaddr = require("multiaddr");

import { NodeId, ENR, SequenceNumber } from "../enr";
import { SessionState, TrustedState, IKeys, ISessionState } from "./types";
import {
  AuthTag,
  createAuthHeader,
  createAuthResponse,
  createAuthTag,
  createRandomPacket,
  createWhoAreYouPacket,
  IAuthHeader,
  IAuthMessagePacket,
  IMessagePacket,
  IWhoAreYouPacket,
  Nonce,
  Tag,
  PacketType,
  IRandomPacket,
} from "../packet";
import {
  generateSessionKeys,
  deriveKeysFromPubkey,
  verifyNonce,
  signNonce,
  decryptAuthHeader,
  decryptMessage,
  encryptAuthResponse,
  encryptMessage,
} from "./crypto";
import { IKeypair } from "../keypair";

// The `Session` struct handles the stages of creating and establishing a handshake with a
// peer.
//
// There are two ways a Session can get initialised.
//
// - An RPC request to an unknown peer is requested by the application.
// In this scenario, a RANDOM packet is sent to the unknown peer.
// - A message was received from an unknown peer and we start the `Session` by sending a
// WHOAREYOU message.
//
// This `Session` module is responsible for generating, deriving and holding keys for sessions for known peers.

interface ISessionOpts {
  state: ISessionState;
  trusted: TrustedState;
  remoteEnr?: ENR;
  lastSeenMultiaddr: Multiaddr;
}

const ERR_NO_ENR = "No available session ENR";
const ERR_INVALID_SIG = "Invalid signature";

/**
 * Manages active handshakes and connections between nodes in discv5.
 * There are three main states a session can be in,
 *  Initializing (`WhoAreYouSent` or `RandomSent`),
 *  Untrusted (when the socket address of the ENR doesn't match the `lastSeenSocket`) and
 *  Established (the session has been successfully established).
 */
export class Session {
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
  constructor({state, trusted, remoteEnr, lastSeenMultiaddr}: ISessionOpts) {
    this.state = state;
    this.trusted = trusted;
    this.remoteEnr = remoteEnr;
    this.lastSeenMultiaddr = lastSeenMultiaddr;
    this.timeout = 0;
  }

  /**
   * Creates a new `Session` instance and generates a RANDOM packet to be sent along with this
   * session being established. This session is set to `RandomSent` state.
   */
  static createWithRandom(tag: Tag, remoteEnr: ENR): [Session, IRandomPacket] {
    return [
      new Session({
        state: {state: SessionState.RandomSent},
        trusted: TrustedState.Untrusted,
        remoteEnr,
        lastSeenMultiaddr: Multiaddr("/ip4/0.0.0.0/udp/0"),
      }),
      createRandomPacket(tag),
    ];
  }

  /**
   * Creates a new `Session` and generates an associated WHOAREYOU packet.
   * The returned session is in the `WhoAreYouSent` state.
   */
  static createWithWhoAreYou(
    nodeId: NodeId,
    enrSeq: SequenceNumber,
    remoteEnr: ENR | null,
    authTag: AuthTag
  ): [Session, IWhoAreYouPacket] {
    return [
      new Session({
        state: {state: SessionState.WhoAreYouSent},
        trusted: TrustedState.Untrusted,
        remoteEnr: remoteEnr as ENR,
        lastSeenMultiaddr: Multiaddr("/ip4/0.0.0.0/udp/0"),
      }),
      createWhoAreYouPacket(nodeId, authTag, enrSeq),
    ];
  }

  /**
   * Generates session keys from an authentication header.
   * If the IP of the ENR does not match the source IP address, the session is considered untrusted.
   * The output returns a boolean which specifies if the Session is trusted or not.
   */
  establishFromHeader(
    kpriv: IKeypair,
    localId: NodeId,
    remoteId: NodeId,
    idNonce: Nonce,
    authHeader: IAuthHeader
  ): boolean {
    const [
      decryptionKey, encryptionKey, authRespKey,
    ] = deriveKeysFromPubkey(
      kpriv,
      localId,
      remoteId,
      idNonce,
      authHeader.ephemeralPubkey
    );
    const keys =  { encryptionKey, decryptionKey, authRespKey };
    const authResponse = decryptAuthHeader(keys.authRespKey, authHeader);

    // update ENR if applicable
    if (authResponse.nodeRecord) {
      if (this.remoteEnr) {
        if (this.remoteEnr.seq < authResponse.nodeRecord.seq) {
          this.remoteEnr = authResponse.nodeRecord;
        }// else don't update
      } else {
        this.remoteEnr = authResponse.nodeRecord;
      }
    }

    if (!this.remoteEnr) {
      throw new Error(ERR_NO_ENR);
    }
    if (!verifyNonce(
      this.remoteEnr.keypair,
      idNonce,
      authHeader.ephemeralPubkey,
      authResponse.signature
    )) {
      throw new Error(ERR_INVALID_SIG);
    }

    this.state = {
      state: SessionState.Established,
      currentKeys: keys,
    };

    return this.updateTrusted();
  }

  /**
   * Encrypts a message and produces an IAuthMessagePacket.
   */
  encryptWithHeader(
    tag: Tag,
    kpriv: IKeypair,
    updatedEnr: ENR | null,
    localNodeId: NodeId,
    idNonce: Nonce,
    message: Buffer
  ): IAuthMessagePacket {
    assert(this.remoteEnr);
    // generate session keys
    const [
      encryptionKey, decryptionKey, authRespKey, ephemeralPubkey,
    ] = generateSessionKeys(localNodeId, this.remoteEnr as ENR, idNonce);
    const keys = { encryptionKey, decryptionKey, authRespKey };
    // create auth header
    const signature = signNonce(kpriv, idNonce, ephemeralPubkey);
    const authHeader = createAuthHeader(
      idNonce,
      ephemeralPubkey,
      encryptAuthResponse(
        keys.authRespKey,
        createAuthResponse(signature, updatedEnr as ENR),
        kpriv.privateKey
      )
    );
    // encrypt the message
    const messageCiphertext = encryptMessage(
      keys.encryptionKey,
      authHeader.authTag,
      message,
      tag
    );
    // update session state
    switch (this.state.state) {
      case SessionState.Established:
        this.state = {
          state: SessionState.EstablishedAwaitingResponse,
          currentKeys: this.state.currentKeys,
          newKeys: keys,
        };
        break;
      case SessionState.Poisoned:
        assert.fail("Coding error if this is possible");
        break;
      default:
        this.state = {
          state: SessionState.AwaitingResponse,
          currentKeys: keys,
        };
    }
    return {
      type: PacketType.AuthMessage,
      tag,
      authHeader,
      message: messageCiphertext,
    };
  }

  /**
   * Uses the current `Session` to encrypt a message.
   * Encrypt packets with the current session key if we are awaiting a response from an
   * IAuthMessagePacket.
   */
  encryptMessage(tag: Tag, message: Buffer): IMessagePacket {
    // TODO: Establish a counter to prevent repeats of nonce
    const authTag = createAuthTag();
    let ciphertext: Buffer;
    switch (this.state.state) {
      case SessionState.Established:
      case SessionState.EstablishedAwaitingResponse:
        ciphertext = encryptMessage(
          this.state.currentKeys.encryptionKey,
          authTag,
          message,
          tag
        );
        break;
      default:
        assert.fail("Session not established");
    }
    return {
      type: PacketType.Message,
      tag,
      authTag,
      message: ciphertext,
    };
  }

  /**
   * Decrypts an encrypted message.
   * If a Session is already established, the original decryption keys are tried first,
   * upon failure, the new keys are attempted. If the new keys succeed,
   * the session keys are updated along with the Session state.
   */
  decryptMessage(nonce: AuthTag, message: Buffer, aad: Buffer): Buffer {
    assert(this.remoteEnr);
    let result: Buffer;
    let keys: IKeys;
    switch (this.state.state) {
      case SessionState.AwaitingResponse:
      case SessionState.Established:
        result = decryptMessage(
          this.state.currentKeys.decryptionKey,
          nonce,
          message,
          aad
        );
        keys = this.state.currentKeys;
        break;
      case SessionState.EstablishedAwaitingResponse:
        // first try current keys, then new keys
        try {
          result = decryptMessage(
            this.state.currentKeys.decryptionKey,
            nonce,
            message,
            aad
          );
          keys = this.state.currentKeys;
        } catch (e) {
          result = decryptMessage(
            this.state.newKeys.decryptionKey,
            nonce,
            message,
            aad
          );
          keys = this.state.newKeys;
        }
        break;
      case SessionState.RandomSent:
      case SessionState.WhoAreYouSent:
        assert.fail("Session not established");
        break;
      default:
        assert.fail("Unreachable");
    }
    this.state = {
      state: SessionState.Established,
      currentKeys: keys,
    };
    return result;
  }

  /**
   * Returns true if the Session has been promoted
   */
  updateEnr(enr: ENR): boolean {
    if (this.remoteEnr) {
      if (this.remoteEnr.seq < enr.seq) {
        this.remoteEnr = enr;
        return this.updateTrusted();
      }
    }
    return false;
  }

  /**
   * Updates the trusted status of a Session.
   * It can be promoted to an `established` state, or demoted to an `untrusted` state.
   * This value returns true if the Session has been promoted.
   */
  updateTrusted(): boolean {
    const hasSameMultiaddr = (multiaddr: Multiaddr, enr: ENR): boolean => {
      const enrMultiaddr = enr.multiaddrUDP;
      return enrMultiaddr ? enrMultiaddr.equals(multiaddr) : false;
    };
    switch (this.trusted) {
      case TrustedState.Untrusted:
        if (this.remoteEnr) {
          if (hasSameMultiaddr(this.lastSeenMultiaddr, this.remoteEnr)) {
            this.trusted = TrustedState.Trusted;
            return true;
          }
        }
        break;
      case TrustedState.Trusted:
        if (this.remoteEnr) {
          if (!hasSameMultiaddr(this.lastSeenMultiaddr, this.remoteEnr)) {
            this.trusted = TrustedState.Untrusted;
          }
        }
    }
    return false;
  }

  isTrusted(): boolean {
    return this.trusted === TrustedState.Trusted;
  }

  /**
   * Returns true if the Session is trusted and has established session keys.
   * This state means the session is capable of sending requests.
   */
  trustedEstablished(): boolean {
    switch (this.state.state) {
      case SessionState.WhoAreYouSent:
      case SessionState.RandomSent:
      case SessionState.AwaitingResponse:
        return false;
      case SessionState.Established:
      case SessionState.EstablishedAwaitingResponse:
        return true;
      default:
        assert.fail("Unreachable");
    }
  }
}
