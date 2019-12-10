import secp256k1 = require("bcrypto/lib/secp256k1");
import { AbstractKeypair, IKeypair, IKeypairClass, KeypairType } from "./types";
import { ERR_INVALID_KEYPAIR_TYPE } from "./constants";

export const Secp256k1Keypair: IKeypairClass = class Secp256k1Keypair extends AbstractKeypair implements IKeypair {
  readonly type = KeypairType.secp256k1;
  static generate(): Secp256k1Keypair {
    const privateKey = secp256k1.privateKeyGenerate();
    const publicKey = secp256k1.publicKeyCreate(privateKey);
    return new Secp256k1Keypair(privateKey, publicKey);
  }
  privateKeyVerify(): boolean {
    return secp256k1.privateKeyVerify(this.privateKey);
  }
  publicKeyVerify(): boolean {
    return secp256k1.publicKeyVerify(this.publicKey);
  }
  sign(msg: Buffer): Buffer {
    return secp256k1.sign(msg, this.privateKey);
  }
  verify(msg: Buffer, sig: Buffer): boolean {
    return secp256k1.verify(msg, sig, this.publicKey);
  }
  deriveSecret(keypair: IKeypair): Buffer {
    if (keypair.type !== this.type) {
      throw new Error(ERR_INVALID_KEYPAIR_TYPE);
    }
    return secp256k1.derive(keypair.publicKey, this.privateKey);
  }
};
