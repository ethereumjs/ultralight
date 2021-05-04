import PeerId from "peer-id";
import { keys } from "libp2p-crypto";
const { keysPBM, supportedKeys } = keys;

import { IKeypair, KeypairType } from "./types";
import { ERR_TYPE_NOT_IMPLEMENTED } from "./constants";
import { Secp256k1Keypair } from "./secp256k1";
import { toBuffer } from "../util";

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

export async function createPeerIdFromKeypair(keypair: IKeypair): Promise<PeerId> {
  switch (keypair.type) {
    case KeypairType.secp256k1:
      try {
        return await PeerId.createFromPrivKey(
          new supportedKeys.secp256k1.Secp256k1PrivateKey(keypair.privateKey, keypair.publicKey).bytes
        );
      } catch (e) {
        return await PeerId.createFromPubKey(new supportedKeys.secp256k1.Secp256k1PublicKey(keypair.publicKey).bytes);
      }
    default:
      throw new Error(ERR_TYPE_NOT_IMPLEMENTED);
  }
}

export function createKeypairFromPeerId(peerId: PeerId): IKeypair {
  // pub/privkey bytes from peer-id are encoded in protobuf format
  const pub = keysPBM.PublicKey.decode(peerId.pubKey.bytes);
  return createKeypair(
    pub.Type as KeypairType,
    peerId.privKey ? toBuffer(peerId.privKey.marshal()) : undefined,
    toBuffer(pub.Data)
  );
}
