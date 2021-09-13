/// <reference types="node" />
export declare enum KeypairType {
    rsa = 0,
    ed25519 = 1,
    secp256k1 = 2
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
    hasPrivateKey(): boolean;
}
export interface IKeypairClass {
    new (privateKey?: Buffer, publicKey?: Buffer): IKeypair;
    generate(): IKeypair;
}
export declare abstract class AbstractKeypair {
    readonly _privateKey?: Buffer;
    readonly _publicKey?: Buffer;
    constructor(privateKey?: Buffer, publicKey?: Buffer);
    get privateKey(): Buffer;
    get publicKey(): Buffer;
    privateKeyVerify(): boolean;
    publicKeyVerify(): boolean;
    hasPrivateKey(): boolean;
}
