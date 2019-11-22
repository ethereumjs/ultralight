import assert = require("assert");
import base64url from "base64url";
import { toBigIntBE } from "bigint-buffer";
import * as RLP from "rlp";

import { MAX_RECORD_SIZE } from "./constants";
import { publicKey, sign, verify } from "./crypto";
import { ENR, ENRKey, ENRValue, PrivateKey, SequenceNumber } from "./types";

export function createENR(privateKey: PrivateKey): ENR {
  const record = new Map();
  // assume v4 scheme
  record.set("id", Buffer.from("v4"));
  record.set("secp256k1", publicKey(privateKey));
  return record;
}

export function decode(encoded: Buffer): [ENR, SequenceNumber] {
  const record = new Map();
  const decoded = RLP.decode(encoded) as unknown as Buffer[];
  assert(Array.isArray(decoded), "Decoded ENR must be an array");
  assert(decoded.length % 2 === 0, "Decoded ENR must have an even number of elements");
  const [signature, seq, ...kvs] = decoded;
  for (let i = 0; i < kvs.length; i += 2) {
    record.set(kvs[i].toString(), Buffer.from(kvs[i + 1]));
  }
  // assume v4 scheme
  assert(verify(record.get("secp256k1"), RLP.encode([seq, ...kvs]), signature));
  return [record, toBigIntBE(seq)];
}

export function decodeTxt(encoded: string): [ENR, SequenceNumber] {
  assert(encoded.startsWith("enr:"), "string encoded ENR must start with 'enr:'");
  return decode(base64url.toBuffer(encoded.slice(4)));
}

export function encode(record: ENR, privateKey: PrivateKey, seq: SequenceNumber): Buffer {
  // sort keys and flatten into [k, v, k, v, ...]
  const content: Array<ENRKey | ENRValue> = Array.from(record.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((k) => ([k, record.get(k)] as [ENRKey, ENRValue]))
    .flat();
  content.unshift(Number(seq));
  // assume v4 scheme
  content.unshift(sign(privateKey, RLP.encode(content)));
  const encoded = RLP.encode(content);
  assert(encoded.length < MAX_RECORD_SIZE, "ENR must be less than 300 bytes");
  return encoded;
}

export function encodeTxt(record: ENR, privateKey: PrivateKey, seq: SequenceNumber): string {
  return "enr:" + base64url.encode(Buffer.from(encode(record, privateKey, seq)));
}
