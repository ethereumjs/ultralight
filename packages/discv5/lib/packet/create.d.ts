/// <reference types="node" />
import { NodeId, SequenceNumber } from "../enr";
import { IHeader, IPacket, PacketType } from "./types";
export declare function createHeader(flag: PacketType, authdata: Buffer, nonce?: Buffer): IHeader;
export declare function createRandomPacket(srcId: NodeId): IPacket;
export declare function createWhoAreYouPacket(nonce: Buffer, enrSeq: SequenceNumber): IPacket;
