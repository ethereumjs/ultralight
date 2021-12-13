/// <reference types="node" />
import { NodeId } from "../enr";
export declare enum PacketType {
    /**
     * Ordinary message packet
     */
    Message = 0,
    /**
     * Sent when the recipient of an ordinary message packet cannot decrypt/authenticate the packet's message
     */
    WhoAreYou = 1,
    /**
     * Sent following a WHOAREYOU.
     * These packets establish a new session and carry handshake related data
     * in addition to the encrypted/authenticated message
     */
    Handshake = 2
}
export interface IStaticHeader {
    /**
     * "discv5"
     */
    protocolId: string;
    /**
     * 2 bytes
     */
    version: number;
    /**
     * 1 byte
     */
    flag: PacketType;
    /**
     * 12 bytes
     */
    nonce: Buffer;
    /**
     * 2 bytes
     */
    authdataSize: number;
}
export interface IHeader extends IStaticHeader {
    authdata: Buffer;
}
export interface IMessageAuthdata {
    /**
     * 32 bytes
     */
    srcId: NodeId;
}
export interface IWhoAreYouAuthdata {
    /**
     * 16 bytes
     */
    idNonce: Buffer;
    /**
     * 8 bytes
     */
    enrSeq: bigint;
}
export interface IHandshakeAuthdata {
    srcId: NodeId;
    sigSize: number;
    ephKeySize: number;
    idSignature: Buffer;
    ephPubkey: Buffer;
    record?: Buffer;
}
export interface IPacket {
    maskingIv: Buffer;
    header: IHeader;
    message: Buffer;
    messageAd?: Buffer;
}
