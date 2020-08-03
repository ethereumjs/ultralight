import hkdf = require("bcrypto/lib/hkdf");
import sha256 = require("bcrypto/lib/sha256");
import cipher = require("bcrypto/lib/cipher");

import { ENR, NodeId } from "../enr";
import {
  AUTH_TAG_LENGTH,
  AuthTag,
  decodeAuthResponse,
  encodeAuthResponse,
  IAuthHeader,
  IAuthResponse,
  Nonce,
} from "../packet";
import { generateKeypair, IKeypair, createKeypair, KeypairType, secp256k1PublicKeyToRaw } from "../keypair";
import { fromHex } from "../util";

// Implementation for generating session keys in the Discv5 protocol.
// Currently, Diffie-Hellman key agreement is performed with known public key types. Session keys
// are then derived using the HKDF (SHA2-256) key derivation function.
//
// There is no abstraction in this module as the specification explicitly defines a singular
// encryption and key-derivation algorithms. Future versions may abstract some of these to allow
// for different algorithms.

const KEY_AGREEMENT_STRING = "discovery v5 key agreement";
const NONCE_PREFIX = "discovery-id-nonce";
const KEY_LENGTH = 16;
const KNOWN_SCHEME = "gcm";
export const MAC_LENGTH = 16;

// Generates session and auth-response keys for a nonce and remote ENR. This currently only
// supports Secp256k1 signed ENR's.
// Returns [initiatorKey, responderKey, authRespKey, ephemPK]
export function generateSessionKeys(localId: NodeId, remoteEnr: ENR, idNonce: Nonce): [Buffer, Buffer, Buffer, Buffer] {
  const remoteKeypair = remoteEnr.keypair;
  const ephemKeypair = generateKeypair(remoteKeypair.type);
  const secret = ephemKeypair.deriveSecret(remoteKeypair);
  const ephemPubkey =
    remoteKeypair.type === KeypairType.secp256k1
      ? secp256k1PublicKeyToRaw(ephemKeypair.publicKey)
      : ephemKeypair.publicKey;
  return [...deriveKey(secret, localId, remoteEnr.nodeId, idNonce), ephemPubkey] as [Buffer, Buffer, Buffer, Buffer];
}

export function deriveKey(secret: Buffer, firstId: NodeId, secondId: NodeId, idNonce: Nonce): [Buffer, Buffer, Buffer] {
  const info = Buffer.concat([Buffer.from(KEY_AGREEMENT_STRING), fromHex(firstId), fromHex(secondId)]);
  const output = hkdf.expand(sha256, hkdf.extract(sha256, secret, idNonce), info, 3 * KEY_LENGTH);
  return [output.slice(0, KEY_LENGTH), output.slice(KEY_LENGTH, 2 * KEY_LENGTH), output.slice(2 * KEY_LENGTH)];
}

export function deriveKeysFromPubkey(
  kpriv: IKeypair,
  localId: NodeId,
  remoteId: NodeId,
  idNonce: Nonce,
  ephemPK: Buffer
): [Buffer, Buffer, Buffer] {
  const secret = kpriv.deriveSecret(createKeypair(kpriv.type, undefined, ephemPK));
  return deriveKey(secret, remoteId, localId, idNonce);
}

// Generates a signature of a nonce given a keypair. This prefixes the `NONCE_PREFIX` to the
// signature.
export function signNonce(kpriv: IKeypair, idNonce: Nonce, ephemPK: Buffer): Buffer {
  const signingNonce = generateSigningNonce(idNonce, ephemPK);
  return kpriv.sign(signingNonce);
}

// Verifies the authentication header nonce.
export function verifyNonce(kpub: IKeypair, idNonce: Nonce, remoteEphemPK: Buffer, sig: Buffer): boolean {
  const signingNonce = generateSigningNonce(idNonce, remoteEphemPK);
  return kpub.verify(signingNonce, sig);
}

export function generateSigningNonce(idNonce: Nonce, ephemPK: Buffer): Buffer {
  return sha256.digest(Buffer.concat([Buffer.from(NONCE_PREFIX), idNonce, ephemPK]));
}

export function encryptAuthResponse(authRespKey: Buffer, authResp: IAuthResponse, enrPrivateKey: Buffer): Buffer {
  return encryptMessage(
    authRespKey,
    Buffer.alloc(AUTH_TAG_LENGTH),
    encodeAuthResponse(authResp, enrPrivateKey),
    Buffer.alloc(0)
  );
}

export function decryptAuthHeader(authRespKey: Buffer, header: IAuthHeader): IAuthResponse {
  if (header.authSchemeName !== KNOWN_SCHEME) {
    throw new Error(`auth header scheme name must be: ${KNOWN_SCHEME}, found: ${header.authSchemeName}`);
  }
  return decodeAuthResponse(
    decryptMessage(authRespKey, Buffer.alloc(AUTH_TAG_LENGTH), header.authResponse, Buffer.alloc(0))
  );
}

export function decryptMessage(key: Buffer, nonce: AuthTag, data: Buffer, aad: Buffer): Buffer {
  if (data.length < MAC_LENGTH) {
    throw new Error("message data not long enough");
  }
  const ctx = new cipher.Decipher("AES-128-GCM");
  ctx.init(key, nonce);
  ctx.setAAD(aad);
  ctx.setAuthTag(data.slice(data.length - MAC_LENGTH));
  return Buffer.concat([
    ctx.update(data.slice(0, data.length - MAC_LENGTH)), // remove appended mac
    ctx.final(),
  ]);
}

export function encryptMessage(key: Buffer, nonce: AuthTag, data: Buffer, aad: Buffer): Buffer {
  const ctx = new cipher.Cipher("AES-128-GCM");
  ctx.init(key, nonce);
  ctx.setAAD(aad);
  return Buffer.concat([
    ctx.update(data),
    ctx.final(),
    ctx.getAuthTag(), // append mac
  ]);
}
