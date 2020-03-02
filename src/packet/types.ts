import { ENR } from "../enr";

// DISCV5 message packet types

export type Tag = Buffer; // TAG_LENGTH
export type Nonce = Buffer; // ID_NONCE_LENGTH
export type AuthTag = Buffer; // AUTH_TAG_LENGTH
export type Magic = Buffer; // MAGIC_LENGTH

export enum PacketType {
  WhoAreYou = 1,
  AuthMessage,
  Message,
}

export type Packet = IWhoAreYouPacket | IAuthMessagePacket | IMessagePacket;

export interface IAuthHeader {
  authTag: Buffer;
  idNonce: Buffer;
  authSchemeName: "gcm" | string;
  ephemeralPubkey: Buffer;
  authResponse: Buffer;
}

export interface IAuthResponse {
  version: number;
  signature: Buffer;
  nodeRecord?: ENR;
}

// Packet format

export interface IRegularPacket {
  // The XOR(SHA256(dest-node-id), src-node-id).
  tag: Tag;
}

/**
 * Packets
 */

export interface IWhoAreYouPacket {
  type: PacketType.WhoAreYou;
  // SHA256(`dest-node-id` || "WHOAREYOU").
  magic: Magic;
  // The auth-tag of the request.
  token: AuthTag;
  // The `id-nonce` to prevent handshake replays.
  idNonce: Nonce;
  // Highest known ENR sequence number of node.
  enrSeq: number;
}

export interface IAuthMessagePacket extends IRegularPacket {
  type: PacketType.AuthMessage;
  // Authentication header.
  authHeader: IAuthHeader;
  // The encrypted message including the authentication header.
  message: Buffer;
}

export interface IMessagePacket extends IRegularPacket {
  type: PacketType.Message;
  // 12 byte Authentication nonce.
  authTag: AuthTag;
  // The encrypted message as raw bytes.
  message: Buffer;
}
