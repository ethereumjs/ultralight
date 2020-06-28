import keccak = require("bcrypto/lib/keccak");
import secp256k1 = require("bcrypto/lib/secp256k1");

import { NodeId } from "./types";
import { createNodeId } from "./create";

export function hash(input: Buffer): Buffer {
  return keccak.digest(input);
}

export function createPrivateKey(): Buffer {
  return secp256k1.privateKeyGenerate();
}

export function publicKey(privKey: Buffer): Buffer {
  return secp256k1.publicKeyCreate(privKey);
}

export function sign(privKey: Buffer, msg: Buffer): Buffer {
  return secp256k1.sign(hash(msg), privKey);
}

export function verify(pubKey: Buffer, msg: Buffer, sig: Buffer): boolean {
  return secp256k1.verify(hash(msg), sig, pubKey);
}

export function nodeId(pubKey: Buffer): NodeId {
  return createNodeId(hash(secp256k1.publicKeyConvert(pubKey, false).slice(1)));
}

export class ENRKeyPair {
  public readonly nodeId: NodeId;
  public readonly privateKey: Buffer;
  public readonly publicKey: Buffer;

  public constructor(privateKey?: Buffer) {
    if (privateKey) {
      if (!secp256k1.privateKeyVerify(privateKey)) {
        throw new Error("Invalid private key");
      }
    }
    this.privateKey = privateKey || createPrivateKey();
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
