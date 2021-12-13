import { Multiaddr } from "multiaddr";

import { NodeId, ENR, SequenceNumber } from "../enr";
import { SessionState, TrustedState, IKeys, ISessionState } from "./types";
import {
  createRandomPacket,
  createWhoAreYouPacket,
  IHandshakeAuthdata,
  IPacket,
  PacketType,
  encodeHandshakeAuthdata,
  createHeader,
  MASKING_IV_SIZE,
  encodeChallengeData,
  encodeMessageAuthdata,
} from "../packet";
import { generateSessionKeys, deriveKeysFromPubkey, decryptMessage, encryptMessage, idSign, idVerify } from "./crypto";
import { IKeypair } from "../keypair";
import { randomBytes } from "crypto";

// The `Session` struct handles the stages of creating and establishing a handshake with a
// peer.
//
// There are two ways a Session can get initialised.
//
// - An RPC request to an unknown peer is requested by the application.
// In this scenario, a packet with random message data is sent to the unknown peer.
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
  constructor({ state, trusted, remoteEnr, lastSeenMultiaddr }: ISessionOpts) {
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
  static createWithRandom(localId: NodeId, remoteEnr: ENR): [Session, IPacket] {
    return [
      new Session({
        state: { state: SessionState.RandomSent },
        trusted: TrustedState.Untrusted,
        remoteEnr,
        lastSeenMultiaddr: new Multiaddr("/ip4/0.0.0.0/udp/0"),
      }),
      createRandomPacket(localId),
    ];
  }

  /**
   * Creates a new `Session` and generates an associated WHOAREYOU packet.
   * The returned session is in the `WhoAreYouSent` state.
   */
  static createWithWhoAreYou(nonce: Buffer, enrSeq: SequenceNumber, remoteEnr: ENR | null): [Session, IPacket] {
    const packet = createWhoAreYouPacket(nonce, enrSeq);
    const challengeData = encodeChallengeData(packet.maskingIv, packet.header);
    return [
      new Session({
        state: { state: SessionState.WhoAreYouSent, challengeData },
        trusted: TrustedState.Untrusted,
        remoteEnr: remoteEnr as ENR,
        lastSeenMultiaddr: new Multiaddr("/ip4/0.0.0.0/udp/0"),
      }),
      packet,
    ];
  }

  /**
   * Generates session keys from a handshake authdata.
   * If the IP of the ENR does not match the source IP address, the session is considered untrusted.
   * The output returns a boolean which specifies if the Session is trusted or not.
   */
  establishFromHandshake(kpriv: IKeypair, localId: NodeId, remoteId: NodeId, authdata: IHandshakeAuthdata): boolean {
    if (this.state.state !== SessionState.WhoAreYouSent) {
      throw new Error("Session must be in WHOAREYOU-sent state");
    }
    const challengeData = this.state.challengeData;
    const [decryptionKey, encryptionKey] = deriveKeysFromPubkey(
      kpriv,
      localId,
      remoteId,
      authdata.ephPubkey,
      challengeData
    );
    const keys = { encryptionKey, decryptionKey };

    // update ENR if applicable
    if (authdata.record) {
      const newRemoteEnr = ENR.decode(authdata.record);
      if (this.remoteEnr) {
        if (this.remoteEnr.seq < newRemoteEnr.seq) {
          this.remoteEnr = newRemoteEnr;
        } // else don't update
      } else {
        this.remoteEnr = newRemoteEnr;
      }
    }

    if (!this.remoteEnr) {
      throw new Error(ERR_NO_ENR);
    }
    if (!idVerify(this.remoteEnr.keypair, challengeData, authdata.ephPubkey, localId, authdata.idSignature)) {
      throw new Error(ERR_INVALID_SIG);
    }

    this.state = {
      state: SessionState.Established,
      currentKeys: keys,
    };

    return this.updateTrusted();
  }

  /**
   * Encrypts a message and produces an handshake packet.
   */
  encryptWithHandshake(
    kpriv: IKeypair,
    challengeData: Buffer,
    srcId: NodeId,
    updatedEnr: Buffer | null,
    message: Buffer
  ): IPacket {
    if (!this.remoteEnr) {
      throw new Error(ERR_NO_ENR);
    }
    // generate session keys
    const [encryptionKey, decryptionKey, ephPubkey] = generateSessionKeys(srcId, this.remoteEnr as ENR, challengeData);
    const keys = { encryptionKey, decryptionKey };

    // create idSignature
    const idSignature = idSign(kpriv, challengeData, ephPubkey, this.remoteEnr.nodeId);

    // create authdata
    const authdata = encodeHandshakeAuthdata({
      srcId,
      sigSize: 64,
      ephKeySize: 33,
      idSignature,
      ephPubkey,
      record: updatedEnr || undefined,
    });

    const header = createHeader(PacketType.Handshake, authdata);
    const maskingIv = randomBytes(MASKING_IV_SIZE);
    const aad = encodeChallengeData(maskingIv, header);

    // encrypt the message
    const messageCiphertext = encryptMessage(keys.encryptionKey, header.nonce, message, aad);
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
        throw new Error("Coding error if this is possible");
      default:
        this.state = {
          state: SessionState.AwaitingResponse,
          currentKeys: keys,
        };
    }
    return {
      maskingIv,
      header,
      message: messageCiphertext,
    };
  }

  /**
   * Uses the current `Session` to encrypt a message.
   * Encrypt packets with the current session key if we are awaiting a response from an
   * IAuthMessagePacket.
   */
  encryptMessage(srcId: NodeId, destId: NodeId, message: Buffer): IPacket {
    const authdata = encodeMessageAuthdata({ srcId });
    const header = createHeader(PacketType.Message, authdata);
    const maskingIv = randomBytes(MASKING_IV_SIZE);
    const aad = encodeChallengeData(maskingIv, header);
    let ciphertext: Buffer;
    switch (this.state.state) {
      case SessionState.Established:
      case SessionState.EstablishedAwaitingResponse:
        ciphertext = encryptMessage(this.state.currentKeys.encryptionKey, header.nonce, message, aad);
        break;
      default:
        throw new Error("Session not established");
    }
    return {
      maskingIv,
      header,
      message: ciphertext,
    };
  }

  /**
   * Decrypts an encrypted message.
   * If a Session is already established, the original decryption keys are tried first,
   * upon failure, the new keys are attempted. If the new keys succeed,
   * the session keys are updated along with the Session state.
   */
  decryptMessage(nonce: Buffer, message: Buffer, aad: Buffer): Buffer {
    if (!this.remoteEnr) {
      throw new Error(ERR_NO_ENR);
    }
    let result: Buffer;
    let keys: IKeys;
    switch (this.state.state) {
      case SessionState.AwaitingResponse:
      case SessionState.Established:
        result = decryptMessage(this.state.currentKeys.decryptionKey, nonce, message, aad);
        keys = this.state.currentKeys;
        break;
      case SessionState.EstablishedAwaitingResponse:
        // first try current keys, then new keys
        try {
          result = decryptMessage(this.state.currentKeys.decryptionKey, nonce, message, aad);
          keys = this.state.currentKeys;
        } catch (e) {
          result = decryptMessage(this.state.newKeys.decryptionKey, nonce, message, aad);
          keys = this.state.newKeys;
        }
        break;
      case SessionState.RandomSent:
      case SessionState.WhoAreYouSent:
        throw new Error("Session not established");
      default:
        throw new Error("Unreachable");
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
    if (this.remoteEnr) {
      const hasSameMultiaddr = (multiaddr: Multiaddr, enr: ENR): boolean => {
        const enrMultiaddr = enr.getLocationMultiaddr("udp");
        return enrMultiaddr ? enrMultiaddr.equals(multiaddr) : false;
      };
      switch (this.trusted) {
        case TrustedState.Untrusted:
          if (hasSameMultiaddr(this.lastSeenMultiaddr, this.remoteEnr)) {
            this.trusted = TrustedState.Trusted;
            return true;
          }
          break;
        case TrustedState.Trusted:
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
        throw new Error("Unreachable");
    }
  }
}
