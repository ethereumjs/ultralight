import cipher = require("bcrypto/lib/cipher");
import { toBigIntBE, toBufferBE } from "bigint-buffer";
import errcode from "err-code";

import { bufferToNumber, fromHex, numberToBuffer, toHex } from "../util";
import {
  AUTHDATA_SIZE_SIZE,
  EPH_KEY_SIZE_SIZE,
  ERR_INVALID_FLAG,
  ERR_INVALID_PROTOCOL_ID,
  ERR_INVALID_VERSION,
  ERR_INVALID_AUTHDATA_SIZE,
  ERR_TOO_LARGE,
  ERR_TOO_SMALL,
  FLAG_SIZE,
  MASKING_IV_SIZE,
  MASKING_KEY_SIZE,
  MAX_PACKET_SIZE,
  MESSAGE_AUTHDATA_SIZE,
  MIN_PACKET_SIZE,
  NONCE_SIZE,
  PROTOCOL_SIZE,
  SIG_SIZE_SIZE,
  STATIC_HEADER_SIZE,
  VERSION_SIZE,
  WHOAREYOU_AUTHDATA_SIZE,
  ID_NONCE_SIZE,
  MIN_HANDSHAKE_AUTHDATA_SIZE,
} from "./constants";
import { IHandshakeAuthdata, IHeader, IMessageAuthdata, IPacket, IWhoAreYouAuthdata, PacketType } from "./types";

export function encodePacket(destId: string, packet: IPacket): Buffer {
  return Buffer.concat([packet.maskingIv, encodeHeader(destId, packet.maskingIv, packet.header), packet.message]);
}

export function encodeHeader(destId: string, maskingIv: Buffer, header: IHeader): Buffer {
  const ctx = new cipher.Cipher("AES-128-CTR");
  ctx.init(fromHex(destId).slice(0, MASKING_KEY_SIZE), maskingIv);
  return ctx.update(
    Buffer.concat([
      // static header
      Buffer.from(header.protocolId, "ascii"),
      numberToBuffer(header.version, VERSION_SIZE),
      numberToBuffer(header.flag, FLAG_SIZE),
      header.nonce,
      numberToBuffer(header.authdataSize, AUTHDATA_SIZE_SIZE),
      // authdata
      header.authdata,
    ])
  );
}

export function decodePacket(srcId: string, data: Buffer): IPacket {
  if (data.length < MIN_PACKET_SIZE) {
    throw errcode(new Error(`Packet too small: ${data.length}`), ERR_TOO_SMALL);
  }
  if (data.length > MAX_PACKET_SIZE) {
    throw errcode(new Error(`Packet too large: ${data.length}`), ERR_TOO_LARGE);
  }

  const maskingIv = data.slice(0, MASKING_IV_SIZE);
  const [header, headerBuf] = decodeHeader(srcId, maskingIv, data.slice(MASKING_IV_SIZE));

  const message = data.slice(MASKING_IV_SIZE + headerBuf.length);
  return {
    maskingIv,
    header,
    message,
    messageAd: Buffer.concat([maskingIv, headerBuf]),
  };
}

/**
 * Return the decoded header and the header as a buffer
 */
export function decodeHeader(srcId: string, maskingIv: Buffer, data: Buffer): [IHeader, Buffer] {
  const ctx = new cipher.Decipher("AES-128-CTR");
  ctx.init(fromHex(srcId).slice(0, MASKING_KEY_SIZE), maskingIv);
  // unmask the static header
  const staticHeaderBuf = ctx.update(data.slice(0, STATIC_HEADER_SIZE));

  // validate the static header field by field
  const protocolId = staticHeaderBuf.slice(0, PROTOCOL_SIZE).toString("ascii");
  if (protocolId !== "discv5") {
    throw errcode(new Error(`Invalid protocol id: ${protocolId}`), ERR_INVALID_PROTOCOL_ID);
  }

  const version = bufferToNumber(staticHeaderBuf.slice(PROTOCOL_SIZE, PROTOCOL_SIZE + VERSION_SIZE), VERSION_SIZE);
  if (version !== 1) {
    throw errcode(new Error(`Invalid version: ${version}`), ERR_INVALID_VERSION);
  }

  const flag = bufferToNumber(
    staticHeaderBuf.slice(PROTOCOL_SIZE + VERSION_SIZE, PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE),
    FLAG_SIZE
  );
  if (PacketType[flag] == null) {
    throw errcode(new Error(`Invalid flag: ${flag}`), ERR_INVALID_FLAG);
  }

  const nonce = staticHeaderBuf.slice(
    PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE,
    PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE
  );

  const authdataSize = bufferToNumber(
    staticHeaderBuf.slice(PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE),
    AUTHDATA_SIZE_SIZE
  );

  // Once the authdataSize is known, unmask the authdata
  const authdata = ctx.update(data.slice(STATIC_HEADER_SIZE, STATIC_HEADER_SIZE + authdataSize));

  return [
    {
      protocolId,
      version,
      flag,
      nonce,
      authdataSize,
      authdata,
    },
    Buffer.concat([staticHeaderBuf, authdata]),
  ];
}

// authdata

export function encodeWhoAreYouAuthdata(authdata: IWhoAreYouAuthdata): Buffer {
  return Buffer.concat([authdata.idNonce, toBufferBE(authdata.enrSeq, 8)]);
}

export function encodeMessageAuthdata(authdata: IMessageAuthdata): Buffer {
  return fromHex(authdata.srcId);
}

export function encodeHandshakeAuthdata(authdata: IHandshakeAuthdata): Buffer {
  return Buffer.concat([
    fromHex(authdata.srcId),
    numberToBuffer(authdata.sigSize, SIG_SIZE_SIZE),
    numberToBuffer(authdata.ephKeySize, EPH_KEY_SIZE_SIZE),
    authdata.idSignature,
    authdata.ephPubkey,
    authdata.record || Buffer.alloc(0),
  ]);
}

export function decodeWhoAreYouAuthdata(data: Buffer): IWhoAreYouAuthdata {
  if (data.length !== WHOAREYOU_AUTHDATA_SIZE) {
    throw errcode(new Error(`Invalid authdata length: ${data.length}`), ERR_INVALID_AUTHDATA_SIZE);
  }
  return {
    idNonce: data.slice(0, ID_NONCE_SIZE),
    enrSeq: toBigIntBE(data.slice(ID_NONCE_SIZE)),
  };
}

export function decodeMessageAuthdata(data: Buffer): IMessageAuthdata {
  if (data.length !== MESSAGE_AUTHDATA_SIZE) {
    throw errcode(new Error(`Invalid authdata length: ${data.length}`), ERR_INVALID_AUTHDATA_SIZE);
  }
  return {
    srcId: toHex(data),
  };
}

export function decodeHandshakeAuthdata(data: Buffer): IHandshakeAuthdata {
  if (data.length < MIN_HANDSHAKE_AUTHDATA_SIZE) {
    throw errcode(new Error(`Invalid authdata length: ${data.length}`), ERR_INVALID_AUTHDATA_SIZE);
  }
  const srcId = toHex(data.slice(0, 32));
  const sigSize = data[32];
  const ephKeySize = data[33];
  const idSignature = data.slice(34, 34 + sigSize);
  const ephPubkey = data.slice(34 + sigSize, 34 + sigSize + ephKeySize);
  const record = data.slice(34 + sigSize + ephKeySize);
  return {
    srcId,
    sigSize,
    ephKeySize,
    idSignature,
    ephPubkey,
    record,
  };
}

/**
 * Encode Challenge Data given masking IV and header
 * Challenge data doubles as message authenticated data
 */
export function encodeChallengeData(maskingIv: Buffer, header: IHeader): Buffer {
  return Buffer.concat([
    maskingIv,
    Buffer.from(header.protocolId),
    numberToBuffer(header.version, VERSION_SIZE),
    numberToBuffer(header.flag, FLAG_SIZE),
    header.nonce,
    numberToBuffer(header.authdataSize, AUTHDATA_SIZE_SIZE),
    header.authdata,
  ]);
}
