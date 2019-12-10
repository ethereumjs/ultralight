import secp256k1 = require("bcrypto/lib/secp256k1");

import { IKeypairFull, IKeypairPrivate, IKeypairPublic, KeypairType } from "./types";

const ERR_NOT_IMPLEMENTED = "Not implemented";
const ERR_INVALID_KEYPAIR_TYPE = "Invalid keypair type";

export function generateKeypair(type: KeypairType): IKeypairFull {
  let privateKey: Buffer, publicKey: Buffer;
  switch (type) {
    case KeypairType.secp256k1:
      privateKey = secp256k1.privateKeyGenerate();
      publicKey = secp256k1.publicKeyCreate(privateKey);
      break;
    default:
      throw new Error(ERR_NOT_IMPLEMENTED);
  }
  return {
    type,
    privateKey,
    publicKey,
  };
}

export function privateKeyVerify(keypair: IKeypairPrivate): boolean {
  switch (keypair.type) {
    case KeypairType.secp256k1:
      return secp256k1.privateKeyVerify(keypair.privateKey);
    default:
      throw new Error(ERR_NOT_IMPLEMENTED);
  }
}

export function publicKeyVerify(keypair: IKeypairPublic): boolean {
  switch (keypair.type) {
    case KeypairType.secp256k1:
      return secp256k1.publicKeyVerify(keypair.publicKey);
    default:
      throw new Error(ERR_NOT_IMPLEMENTED);
  }
}

export function sign(keypair: IKeypairPrivate, msg: Buffer): Buffer {
  switch (keypair.type) {
    case KeypairType.secp256k1:
      return secp256k1.sign(msg, keypair.privateKey);
    default:
      throw new Error(ERR_NOT_IMPLEMENTED);
  }
}

export function verify(keypair: IKeypairPublic, msg: Buffer, sig: Buffer): boolean {
  switch (keypair.type) {
    case KeypairType.secp256k1:
      return secp256k1.verify(msg, sig, keypair.publicKey);
    default:
      throw new Error(ERR_NOT_IMPLEMENTED);
  }
}

export function deriveSecret(kpub: IKeypairPublic, kpriv: IKeypairPrivate): Buffer {
  if (kpub.type !== kpriv.type) {
    throw new Error(ERR_INVALID_KEYPAIR_TYPE);
  }
  switch (kpub.type) {
    case KeypairType.secp256k1:
      return secp256k1.derive(kpub.publicKey, kpriv.privateKey);
    default:
      throw new Error(ERR_NOT_IMPLEMENTED);
  }
}
