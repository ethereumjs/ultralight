"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptMessage = exports.decryptMessage = exports.generateIdSignatureInput = exports.idVerify = exports.idSign = exports.deriveKeysFromPubkey = exports.deriveKey = exports.generateSessionKeys = exports.MAC_LENGTH = void 0;
const hkdf = require("bcrypto/lib/hkdf");
const sha256 = require("bcrypto/lib/sha256");
const cipher = require("bcrypto/lib/cipher");
const keypair_1 = require("../keypair");
const util_1 = require("../util");
// Implementation for generating session keys in the Discv5 protocol.
// Currently, Diffie-Hellman key agreement is performed with known public key types. Session keys
// are then derived using the HKDF (SHA2-256) key derivation function.
//
// There is no abstraction in this module as the specification explicitly defines a singular
// encryption and key-derivation algorithms. Future versions may abstract some of these to allow
// for different algorithms.
const KEY_AGREEMENT_STRING = "discovery v5 key agreement";
const ID_SIGNATURE_TEXT = "discovery v5 identity proof";
const KEY_LENGTH = 16;
exports.MAC_LENGTH = 16;
// Generates session keys for a challengeData and remote ENR. This currently only
// supports Secp256k1 signed ENR's.
// Returns [initiatorKey, responderKey, ephemPK]
function generateSessionKeys(localId, remoteEnr, challengeData) {
    const remoteKeypair = remoteEnr.keypair;
    const ephemKeypair = keypair_1.generateKeypair(remoteKeypair.type);
    const secret = ephemKeypair.deriveSecret(remoteKeypair);
    /* TODO possibly not needed, check tests
    const ephemPubkey =
      remoteKeypair.type === KeypairType.secp256k1
        ? secp256k1PublicKeyToCompressed(ephemKeypair.publicKey)
        : ephemKeypair.publicKey;
    */
    return [...deriveKey(secret, localId, remoteEnr.nodeId, challengeData), ephemKeypair.publicKey];
}
exports.generateSessionKeys = generateSessionKeys;
function deriveKey(secret, firstId, secondId, challengeData) {
    const info = Buffer.concat([Buffer.from(KEY_AGREEMENT_STRING), util_1.fromHex(firstId), util_1.fromHex(secondId)]);
    const output = hkdf.expand(sha256, hkdf.extract(sha256, secret, challengeData), info, 2 * KEY_LENGTH);
    return [output.slice(0, KEY_LENGTH), output.slice(KEY_LENGTH, 2 * KEY_LENGTH)];
}
exports.deriveKey = deriveKey;
function deriveKeysFromPubkey(kpriv, localId, remoteId, ephemPK, challengeData) {
    const secret = kpriv.deriveSecret(keypair_1.createKeypair(kpriv.type, undefined, ephemPK));
    return deriveKey(secret, remoteId, localId, challengeData);
}
exports.deriveKeysFromPubkey = deriveKeysFromPubkey;
// Generates a signature given a keypair.
function idSign(kpriv, challengeData, ephemPK, destNodeId) {
    const signingNonce = generateIdSignatureInput(challengeData, ephemPK, destNodeId);
    return kpriv.sign(signingNonce);
}
exports.idSign = idSign;
// Verifies the id signature
function idVerify(kpub, challengeData, remoteEphemPK, srcNodeId, sig) {
    const signingNonce = generateIdSignatureInput(challengeData, remoteEphemPK, srcNodeId);
    return kpub.verify(signingNonce, sig);
}
exports.idVerify = idVerify;
function generateIdSignatureInput(challengeData, ephemPK, nodeId) {
    return sha256.digest(Buffer.concat([Buffer.from(ID_SIGNATURE_TEXT), challengeData, ephemPK, util_1.fromHex(nodeId)]));
}
exports.generateIdSignatureInput = generateIdSignatureInput;
function decryptMessage(key, nonce, data, aad) {
    if (data.length < exports.MAC_LENGTH) {
        throw new Error("message data not long enough");
    }
    const ctx = new cipher.Decipher("AES-128-GCM");
    ctx.init(key, nonce);
    ctx.setAAD(aad);
    ctx.setAuthTag(data.slice(data.length - exports.MAC_LENGTH));
    return Buffer.concat([
        ctx.update(data.slice(0, data.length - exports.MAC_LENGTH)),
        ctx.final(),
    ]);
}
exports.decryptMessage = decryptMessage;
function encryptMessage(key, nonce, data, aad) {
    const ctx = new cipher.Cipher("AES-128-GCM");
    ctx.init(key, nonce);
    ctx.setAAD(aad);
    return Buffer.concat([
        ctx.update(data),
        ctx.final(),
        ctx.getAuthTag(),
    ]);
}
exports.encryptMessage = encryptMessage;
