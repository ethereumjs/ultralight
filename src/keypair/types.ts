export enum KeypairType {
  rsa,
  ed25519,
  secp256k1,
}

export interface IKeypair {
  type: KeypairType;
  privateKey?: Buffer;
  publicKey?: Buffer;
}

export interface IKeypairFull {
  type: KeypairType;
  privateKey: Buffer;
  publicKey: Buffer;
}


export interface IKeypairPublic {
  type: KeypairType;
  privateKey?: Buffer;
  publicKey: Buffer;
}

export interface IKeypairPrivate {
  type: KeypairType;
  privateKey: Buffer;
  publicKey?: Buffer;
}
