import * as RLP from "rlp";
import { ENR } from "../enr";
import {
  IAuthMessagePacket,
  IMessagePacket,
  IWhoAreYouPacket,
  Magic,
  Packet,
  PacketType,
  Tag,
  IAuthResponse,
} from "./types";

import {
  AUTH_TAG_LENGTH,
  ERR_INVALID_BYTE_SIZE,
  ERR_TOO_LARGE,
  ERR_TOO_SMALL,
  ERR_UNKNOWN_FORMAT,
  MAX_PACKET_SIZE,
  ID_NONCE_LENGTH,
  TAG_LENGTH,
} from "./constants";

/**
 * Decode raw bytes into a packet. The `magic` value (SHA2256(node-id, b"WHOAREYOU")) is passed as a parameter to check
 * for the magic byte sequence.
 *
 * Note: this function will modify the input data
 */
export function decode(data: Buffer, magic: Magic): Packet {
  if (data.length > MAX_PACKET_SIZE) {
    throw new Error(ERR_TOO_LARGE);
  }
  // ensure the packet is large enough to contain the correct headers
  if (data.length < TAG_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error(ERR_TOO_SMALL);
  }
  const tag = data.slice(0, TAG_LENGTH);
  data = data.slice(TAG_LENGTH);
  const decoded = RLP.decode(data, true) as unknown as RLP.Decoded;
  // data looks like either:
  //   magic ++ rlp_list(...)
  //   tag   ++ rlp_bytes(...) ++ message
  //   tag   ++ rlp_list(...)  ++ message
  if (tag.equals(magic)) {
    return decodeWhoAreYou(tag, decoded.data as Buffer[], decoded.remainder);
  } else if (!Array.isArray(decoded.data)) {
    return decodeStandardMessage(tag, decoded.data, decoded.remainder);
  } else {
    return decodeAuthHeader(tag, decoded.data, decoded.remainder);
  }
}

export function decodeWhoAreYou(magic: Magic, data: Buffer[], remainder: Buffer): IWhoAreYouPacket {
  if (!Array.isArray(data) || data.length !== 3 || remainder.length > 0) {
    throw new Error(ERR_UNKNOWN_FORMAT);
  }
  const [token, idNonce, enrSeqBytes] = data;
  if (
    idNonce.length !== ID_NONCE_LENGTH ||
    token.length !== AUTH_TAG_LENGTH
  ) {
    throw new Error(ERR_INVALID_BYTE_SIZE);
  }
  const enrSeq = Number(`0x${enrSeqBytes.toString("hex")}`);
  return {
    type: PacketType.WhoAreYou,
    token,
    magic,
    idNonce,
    enrSeq,
  };
}

export function decodeStandardMessage(tag: Tag, data: Buffer, remainder: Buffer): IMessagePacket {
  return {
    type: PacketType.Message,
    tag,
    authTag: data,
    message: remainder,
  };
}

// Decode a message that contains an authentication header
export function decodeAuthHeader(tag: Tag, data: Buffer[], remainder: Buffer): IAuthMessagePacket {
  if (!Array.isArray(data) || data.length !== 5) {
    throw new Error(ERR_UNKNOWN_FORMAT);
  }
  const [
    authTag,
    idNonce,
    authSchemeNameBytes,
    ephemeralPubkey,
    authResponse,
  ] = data;
  return {
    type: PacketType.AuthMessage,
    tag,
    authHeader: {
      authTag,
      idNonce,
      authSchemeName: authSchemeNameBytes.toString("utf8"),
      ephemeralPubkey,
      authResponse,
    },
    message: remainder,
  };
}

export function decodeAuthResponse(data: Buffer): IAuthResponse {
  const responseRaw = RLP.decode(data) as unknown as RLP.Decoded;
  if (
    !Array.isArray(responseRaw) ||
    responseRaw.length !== 3
  ) {
    throw new Error(ERR_UNKNOWN_FORMAT);
  }
  const response: IAuthResponse = {
    version: responseRaw[0].readUint8(0),
    signature: responseRaw[1],
  };
  if (!Array.isArray(responseRaw[2])) {
    response.nodeRecord = ENR.decode(responseRaw[2]);
  }
  return response;
}
