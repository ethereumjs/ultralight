"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const multiaddr_1 = require("multiaddr");
const enr_1 = require("../enr");
const types_1 = require("./types");
const packet_1 = require("../packet");
const crypto_1 = require("./crypto");
const crypto_2 = require("crypto");
const ERR_NO_ENR = "No available session ENR";
const ERR_INVALID_SIG = "Invalid signature";
/**
 * Manages active handshakes and connections between nodes in discv5.
 * There are three main states a session can be in,
 *  Initializing (`WhoAreYouSent` or `RandomSent`),
 *  Untrusted (when the socket address of the ENR doesn't match the `lastSeenSocket`) and
 *  Established (the session has been successfully established).
 */
class Session {
    constructor({ state, trusted, remoteEnr, lastSeenMultiaddr }) {
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
    static createWithRandom(localId, remoteEnr) {
        const transport = remoteEnr.tcp ? "tcp" : "udp";
        return [
            new Session({
                state: { state: types_1.SessionState.RandomSent },
                trusted: types_1.TrustedState.Untrusted,
                remoteEnr,
                lastSeenMultiaddr: new multiaddr_1.Multiaddr(`/ip4/0.0.0.0/${transport}/0`),
            }),
            packet_1.createRandomPacket(localId),
        ];
    }
    /**
     * Creates a new `Session` and generates an associated WHOAREYOU packet.
     * The returned session is in the `WhoAreYouSent` state.
     */
    static createWithWhoAreYou(nonce, enrSeq, remoteEnr) {
        const packet = packet_1.createWhoAreYouPacket(nonce, enrSeq);
        const challengeData = packet_1.encodeChallengeData(packet.maskingIv, packet.header);
        return [
            new Session({
                state: { state: types_1.SessionState.WhoAreYouSent, challengeData },
                trusted: types_1.TrustedState.Untrusted,
                remoteEnr: remoteEnr,
                lastSeenMultiaddr: new multiaddr_1.Multiaddr("/ip4/0.0.0.0/udp/0"),
            }),
            packet,
        ];
    }
    /**
     * Generates session keys from a handshake authdata.
     * If the IP of the ENR does not match the source IP address, the session is considered untrusted.
     * The output returns a boolean which specifies if the Session is trusted or not.
     */
    establishFromHandshake(kpriv, localId, remoteId, authdata) {
        if (this.state.state !== types_1.SessionState.WhoAreYouSent) {
            throw new Error("Session must be in WHOAREYOU-sent state");
        }
        const challengeData = this.state.challengeData;
        const [decryptionKey, encryptionKey] = crypto_1.deriveKeysFromPubkey(kpriv, localId, remoteId, authdata.ephPubkey, challengeData);
        const keys = { encryptionKey, decryptionKey };
        // update ENR if applicable
        if (authdata.record) {
            const newRemoteEnr = enr_1.ENR.decode(authdata.record);
            if (this.remoteEnr) {
                if (this.remoteEnr.seq < newRemoteEnr.seq) {
                    this.remoteEnr = newRemoteEnr;
                } // else don't update
            }
            else {
                this.remoteEnr = newRemoteEnr;
            }
        }
        if (!this.remoteEnr) {
            throw new Error(ERR_NO_ENR);
        }
        if (!crypto_1.idVerify(this.remoteEnr.keypair, challengeData, authdata.ephPubkey, localId, authdata.idSignature)) {
            throw new Error(ERR_INVALID_SIG);
        }
        this.state = {
            state: types_1.SessionState.Established,
            currentKeys: keys,
        };
        return this.updateTrusted();
    }
    /**
     * Encrypts a message and produces an handshake packet.
     */
    encryptWithHandshake(kpriv, challengeData, srcId, updatedEnr, message) {
        if (!this.remoteEnr) {
            throw new Error(ERR_NO_ENR);
        }
        // generate session keys
        const [encryptionKey, decryptionKey, ephPubkey] = crypto_1.generateSessionKeys(srcId, this.remoteEnr, challengeData);
        const keys = { encryptionKey, decryptionKey };
        // create idSignature
        const idSignature = crypto_1.idSign(kpriv, challengeData, ephPubkey, this.remoteEnr.nodeId);
        // create authdata
        const authdata = packet_1.encodeHandshakeAuthdata({
            srcId,
            sigSize: 64,
            ephKeySize: 33,
            idSignature,
            ephPubkey,
            record: updatedEnr || undefined,
        });
        const header = packet_1.createHeader(packet_1.PacketType.Handshake, authdata);
        const maskingIv = crypto_2.randomBytes(packet_1.MASKING_IV_SIZE);
        const aad = packet_1.encodeChallengeData(maskingIv, header);
        // encrypt the message
        const messageCiphertext = crypto_1.encryptMessage(keys.encryptionKey, header.nonce, message, aad);
        // update session state
        switch (this.state.state) {
            case types_1.SessionState.Established:
                this.state = {
                    state: types_1.SessionState.EstablishedAwaitingResponse,
                    currentKeys: this.state.currentKeys,
                    newKeys: keys,
                };
                break;
            case types_1.SessionState.Poisoned:
                throw new Error("Coding error if this is possible");
            default:
                this.state = {
                    state: types_1.SessionState.AwaitingResponse,
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
    encryptMessage(srcId, destId, message) {
        const authdata = packet_1.encodeMessageAuthdata({ srcId });
        const header = packet_1.createHeader(packet_1.PacketType.Message, authdata);
        const maskingIv = crypto_2.randomBytes(packet_1.MASKING_IV_SIZE);
        const aad = packet_1.encodeChallengeData(maskingIv, header);
        let ciphertext;
        switch (this.state.state) {
            case types_1.SessionState.Established:
            case types_1.SessionState.EstablishedAwaitingResponse:
                ciphertext = crypto_1.encryptMessage(this.state.currentKeys.encryptionKey, header.nonce, message, aad);
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
    decryptMessage(nonce, message, aad) {
        if (!this.remoteEnr) {
            throw new Error(ERR_NO_ENR);
        }
        let result;
        let keys;
        switch (this.state.state) {
            case types_1.SessionState.AwaitingResponse:
            case types_1.SessionState.Established:
                result = crypto_1.decryptMessage(this.state.currentKeys.decryptionKey, nonce, message, aad);
                keys = this.state.currentKeys;
                break;
            case types_1.SessionState.EstablishedAwaitingResponse:
                // first try current keys, then new keys
                try {
                    result = crypto_1.decryptMessage(this.state.currentKeys.decryptionKey, nonce, message, aad);
                    keys = this.state.currentKeys;
                }
                catch (e) {
                    result = crypto_1.decryptMessage(this.state.newKeys.decryptionKey, nonce, message, aad);
                    keys = this.state.newKeys;
                }
                break;
            case types_1.SessionState.RandomSent:
            case types_1.SessionState.WhoAreYouSent:
                throw new Error("Session not established");
            default:
                throw new Error("Unreachable");
        }
        this.state = {
            state: types_1.SessionState.Established,
            currentKeys: keys,
        };
        return result;
    }
    /**
     * Returns true if the Session has been promoted
     */
    updateEnr(enr) {
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
    updateTrusted() {
        if (this.remoteEnr) {
            const hasSameMultiaddr = (multiaddr, enr) => {
                const transport = enr.tcp ? "tcp" : "udp";
                const enrMultiaddr = enr.getLocationMultiaddr(transport);
                return enrMultiaddr ? enrMultiaddr.equals(multiaddr) : false;
            };
            switch (this.trusted) {
                case types_1.TrustedState.Untrusted:
                    if (hasSameMultiaddr(this.lastSeenMultiaddr, this.remoteEnr)) {
                        this.trusted = types_1.TrustedState.Trusted;
                        return true;
                    }
                    break;
                case types_1.TrustedState.Trusted:
                    if (!hasSameMultiaddr(this.lastSeenMultiaddr, this.remoteEnr)) {
                        this.trusted = types_1.TrustedState.Untrusted;
                    }
            }
        }
        return false;
    }
    isTrusted() {
        return this.trusted === types_1.TrustedState.Trusted;
    }
    /**
     * Returns true if the Session is trusted and has established session keys.
     * This state means the session is capable of sending requests.
     */
    trustedEstablished() {
        switch (this.state.state) {
            case types_1.SessionState.WhoAreYouSent:
            case types_1.SessionState.RandomSent:
            case types_1.SessionState.AwaitingResponse:
                return false;
            case types_1.SessionState.Established:
            case types_1.SessionState.EstablishedAwaitingResponse:
                return true;
            default:
                throw new Error("Unreachable");
        }
    }
}
exports.Session = Session;
