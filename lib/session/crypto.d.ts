/// <reference types="node" />
import { ENR, NodeId } from "../enr";
import { IKeypair } from "../keypair";
export declare const MAC_LENGTH = 16;
export declare function generateSessionKeys(localId: NodeId, remoteEnr: ENR, challengeData: Buffer): [Buffer, Buffer, Buffer];
export declare function deriveKey(secret: Buffer, firstId: NodeId, secondId: NodeId, challengeData: Buffer): [Buffer, Buffer];
export declare function deriveKeysFromPubkey(kpriv: IKeypair, localId: NodeId, remoteId: NodeId, ephemPK: Buffer, challengeData: Buffer): [Buffer, Buffer];
export declare function idSign(kpriv: IKeypair, challengeData: Buffer, ephemPK: Buffer, destNodeId: NodeId): Buffer;
export declare function idVerify(kpub: IKeypair, challengeData: Buffer, remoteEphemPK: Buffer, srcNodeId: NodeId, sig: Buffer): boolean;
export declare function generateIdSignatureInput(challengeData: Buffer, ephemPK: Buffer, nodeId: NodeId): Buffer;
export declare function decryptMessage(key: Buffer, nonce: Buffer, data: Buffer, aad: Buffer): Buffer;
export declare function encryptMessage(key: Buffer, nonce: Buffer, data: Buffer, aad: Buffer): Buffer;
