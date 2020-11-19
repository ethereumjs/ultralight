import { NodeId } from "../enr";

// DISCV5 message packet types

export enum PacketType {
  /**
   * Ordinary message packet
   */
  Message = 0,
  /**
   * Sent when the recipient of an ordinary message packet cannot decrypt/authenticate the packet's message
   */
  WhoAreYou,
  /**
   * Sent following a WHOAREYOU.
   * These packets establish a new session and carry handshake related data
   * in addition to the encrypted/authenticated message
   */
  Handshake,
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

// A IHeader contains an "authdata
// the contents of which are dependent on the packet type

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
  // pre-encoded ENR
  record?: Buffer;
}

export interface IPacket {
  maskingIv: Buffer;
  header: IHeader;
  message: Buffer;
  messageAd?: Buffer;
}
