import { IKeypair, KeypairType } from "./types";
import { ERR_TYPE_NOT_IMPLEMENTED } from "./constants";
import { Secp256k1Keypair } from "./secp256k1";

export * from "./types";
export * from "./secp256k1";

export function generateKeypair(type: KeypairType): IKeypair {
  switch (type) {
    case KeypairType.secp256k1:
      return Secp256k1Keypair.generate();
    default:
      throw new Error(ERR_TYPE_NOT_IMPLEMENTED);
  }
}

export function createKeypair(type: KeypairType, privateKey?: Buffer, publicKey?: Buffer): IKeypair {
  switch (type) {
    case KeypairType.secp256k1:
      return new Secp256k1Keypair(privateKey, publicKey);
    default:
      throw new Error(ERR_TYPE_NOT_IMPLEMENTED);
  }
}
