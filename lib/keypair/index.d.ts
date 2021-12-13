/// <reference types="node" />
import PeerId from "peer-id";
import { IKeypair, KeypairType } from "./types";
export * from "./types";
export * from "./secp256k1";
export declare function generateKeypair(type: KeypairType): IKeypair;
export declare function createKeypair(type: KeypairType, privateKey?: Buffer, publicKey?: Buffer): IKeypair;
export declare function createPeerIdFromKeypair(keypair: IKeypair): Promise<PeerId>;
export declare function createKeypairFromPeerId(peerId: PeerId): IKeypair;
