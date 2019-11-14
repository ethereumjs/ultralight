// @ts-ignore
import keccak from "keccakjs";
import randomBytes from "randombytes";
import * as secp256k1 from "secp256k1";

import {
  NodeId,
  PrivateKey,
  PublicKey,
} from "./types";

export function hash(input: Buffer): Buffer {
  const h = new keccak(256);
  h.update(input);
  return Buffer.from(h.digest(), "binary");
}

export function createPrivateKey(): PrivateKey {
  let privKey;
  do {
    privKey = randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privKey));
  return privKey;
}

export function publicKey(privKey: PrivateKey): PublicKey {
  return secp256k1.publicKeyCreate(privKey);
}

export function sign(privKey: PrivateKey, msg: Buffer): Buffer {
  return secp256k1.sign(
    hash(msg),
    privKey,
  ).signature;
}

export function verify(pubKey: PublicKey, msg: Buffer, sig: Buffer): boolean {
  return secp256k1.verify(hash(msg), sig, pubKey);
}

export function nodeId(pubKey: PublicKey): NodeId {
  return hash(secp256k1.publicKeyConvert(pubKey, false));
}

export class ENRKeyPair {
  public readonly nodeId: NodeId;
  public readonly privateKey: PrivateKey;
  public readonly publicKey: PublicKey;

  public constructor() {
    this.privateKey = createPrivateKey();
    this.publicKey = publicKey(this.privateKey);
    this.nodeId = nodeId(this.publicKey);
  }

  public sign(msg: Buffer): Buffer {
    return sign(this.privateKey, msg);
  }

  public verify(msg: Buffer, sig: Buffer): boolean {
    return verify(this.publicKey, msg, sig);
  }
}
