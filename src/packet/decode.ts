import * as RLP from "rlp";
import {
  IAuthMessagePacket,
  IMessagePacket,
  IWhoAreYouPacket,
  Magic,
  Packet,
  Tag,
} from "./types";

import {
  AUTH_TAG_LENGTH,
  ERR_INVALID_BYTE_SIZE,
  ERR_TOO_SMALL,
  ERR_UNKNOWN_FORMAT,
  ID_NONCE_LENGTH,
  TAG_LENGTH,
} from "./constants";

/**
 * Decode raw bytes into a packet. The `magic` value (SHA2256(node-id, b"WHOAREYOU")) is passed as a parameter to check
 * for the magic byte sequence.
 */
export function decode(data: Buffer, magic: Magic): Packet {
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
    token,
    magic,
    idNonce,
    enrSeq,
  };
}

export function decodeStandardMessage(tag: Tag, data: Buffer, remainder: Buffer): IMessagePacket {
  return {
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
