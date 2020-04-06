import { randomBytes } from "bcrypto/lib/random";
import sha256 = require("bcrypto/lib/sha256");

import { AUTH_TAG_LENGTH, ID_NONCE_LENGTH, RANDOM_DATA_LENGTH, WHOAREYOU_STRING } from "./constants";
import { Tag, AuthTag, IWhoAreYouPacket, IAuthResponse, Nonce, IAuthHeader, PacketType, IRandomPacket } from "./types";
import { NodeId, SequenceNumber, ENR } from "../enr";
import { fromHex, toHex } from "../util";

export function createRandomPacket(tag: Tag): IRandomPacket {
  return {
    type: PacketType.Random,
    tag,
    authTag: randomBytes(AUTH_TAG_LENGTH),
    message: randomBytes(RANDOM_DATA_LENGTH),
  };
}

export function createMagic(nodeId: NodeId): Buffer {
  return sha256.digest(Buffer.concat([fromHex(nodeId), Buffer.from(WHOAREYOU_STRING, "utf-8")]));
}

export function createWhoAreYouPacket(
  nodeId: NodeId,
  authTag: AuthTag,
  enrSeq: SequenceNumber
): IWhoAreYouPacket {
  return {
    type: PacketType.WhoAreYou,
    magic: createMagic(nodeId),
    token: authTag,
    idNonce: randomBytes(ID_NONCE_LENGTH),
    enrSeq: Number(enrSeq),
  };
}

export function createAuthTag(): AuthTag {
  return randomBytes(AUTH_TAG_LENGTH);
}

export function createAuthHeader(
  idNonce: Nonce,
  ephemeralPubkey: Buffer,
  authResponse: Buffer,
  authTag?: AuthTag
): IAuthHeader {
  return {
    authTag: authTag || createAuthTag(),
    idNonce,
    authSchemeName: "gcm",
    ephemeralPubkey,
    authResponse,
  };
}

export function createAuthResponse(signature: Buffer, enr?: ENR): IAuthResponse {
  return {
    version: 5,
    signature,
    nodeRecord: enr,
  };
}

// calculate node id / tag

export function createSrcId(dstId: NodeId, tag: Tag): NodeId {
  const hash = sha256.digest(fromHex(dstId));
  // reuse `hash` buffer for output
  for (let i = 0; i < 32; i++) {
    hash[i] = hash[i] ^ tag[i];
  }
  return toHex(hash);
}

export function createTag(srcId: NodeId, dstId: NodeId): Tag {
  const nodeId = fromHex(srcId);
  const hash = sha256.digest(fromHex(dstId));
  // reuse `hash` buffer for output
  for (let i = 0; i < 32; i++) {
    hash[i] = hash[i] ^ nodeId[i];
  }
  return hash;
}
