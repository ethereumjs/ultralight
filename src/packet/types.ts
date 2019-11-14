// DISCV5 message packet types

export type Tag = Buffer; // TAG_LENGTH
export type Nonce = Buffer; // ID_NONCE_LENGTH
export type AuthTag = Buffer; // AUTH_TAG_LENGTH
export type Magic = Buffer; // MAGIC_LENGTH

export enum PacketType {
  Random = 1,
  WhoAreYou,
  AuthMessage,
  Message,
}

export type Packet = IRandomPacket | IWhoAreYouPacket | IAuthMessagePacket | IMessagePacket;

export interface IAuthHeader {
  authTag: Buffer;
  idNonce: Buffer;
  authSchemeName: "gcm" | string;
  ephemeralPubkey: Buffer;
  authResponse: Buffer;
}

// Packet format

export interface IRegularPacket {
  // The XOR(SHA256(dest-node-id), src-node-id).
  tag: Tag;
}

/**
 * Packets
 */

export interface IRandomPacket extends IRegularPacket {
  // Random auth_tag formatted as rlp_bytes(bytes).
  authTag: AuthTag;
  // At least 44 bytes of random data.
  randomData: Buffer;
}

export interface IWhoAreYouPacket {
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
  // Authentication header.
  authHeader: IAuthHeader;
  // The encrypted message including the authentication header.
  message: Buffer;
}

export interface IMessagePacket extends IRegularPacket {
  // 12 byte Authentication nonce.
  authTag: AuthTag;
  // The encrypted message as raw bytes.
  message: Buffer;
}
