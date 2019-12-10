export enum KeypairType {
  rsa,
  ed25519,
  secp256k1,
}

export interface IKeypair {
  type: KeypairType;
  privateKey: Buffer;
  publicKey: Buffer;
  privateKeyVerify(): boolean;
  publicKeyVerify(): boolean;
  sign(msg: Buffer): Buffer;
  verify(msg: Buffer, sig: Buffer): boolean;
  deriveSecret(keypair: IKeypair): Buffer;
}

export interface IKeypairClass {
  new(privateKey?: Buffer, publicKey?: Buffer): IKeypair;
  generate(): IKeypair;
}

export abstract class AbstractKeypair {
  readonly _privateKey: Buffer | null;
  readonly _publicKey: Buffer | null;
  constructor(privateKey?: Buffer, publicKey?: Buffer) {
    this._privateKey = privateKey || null;
    this._publicKey = publicKey || null;
  }
  get privateKey(): Buffer {
    if (!this._privateKey) {
      throw new Error();
    }
    return this._privateKey;
  }
  get publicKey(): Buffer {
    if (!this._publicKey) {
      throw new Error();
    }
    return this._publicKey;
  }
}
