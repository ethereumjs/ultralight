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
  readonly _privateKey?: Buffer;
  readonly _publicKey?: Buffer;
  constructor(privateKey?: Buffer, publicKey?: Buffer) {
    if (
      (this._privateKey = privateKey) &&
      !this.privateKeyVerify()
    ) {
      throw new Error("Invalid private key");
    }
    if (
      (this._publicKey = publicKey) &&
      !this.publicKeyVerify()
    ) {
      throw new Error("Invalid private key");
    }
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
  privateKeyVerify(): boolean {
    return true;
  }
  publicKeyVerify(): boolean {
    return true;
  }
}
