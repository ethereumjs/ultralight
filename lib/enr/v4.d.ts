/// <reference types="node" />
import { NodeId } from "./types";
export declare function hash(input: Buffer): Buffer;
export declare function createPrivateKey(): Buffer;
export declare function publicKey(privKey: Buffer): Buffer;
export declare function sign(privKey: Buffer, msg: Buffer): Buffer;
export declare function verify(pubKey: Buffer, msg: Buffer, sig: Buffer): boolean;
export declare function nodeId(pubKey: Buffer): NodeId;
export declare class ENRKeyPair {
    readonly nodeId: NodeId;
    readonly privateKey: Buffer;
    readonly publicKey: Buffer;
    constructor(privateKey?: Buffer);
    sign(msg: Buffer): Buffer;
    verify(msg: Buffer, sig: Buffer): boolean;
}
