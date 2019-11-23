import assert = require("assert");
import base64url from "base64url";
import { toBigIntBE } from "bigint-buffer";
import * as RLP from "rlp";

import { MAX_RECORD_SIZE } from "./constants";
import * as v4 from "./v4";
import { ENR, ENRKey, ENRValue, PrivateKey, SequenceNumber } from "./types";

export function createENR(privateKey: PrivateKey, id = "v4"): ENR {
  const record = new Map();
  record.set("id", Buffer.from(id));
  switch (id) {
    case "v4":
      record.set("secp256k1", v4.publicKey(privateKey));
      break;
    default:
      assert.fail("invalid id");
  }
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
  switch (record.get("id").toString("utf8")) {
    case "v4":
      assert(v4.verify(record.get("secp256k1"), RLP.encode([seq, ...kvs]), signature));
      break;
    default:
      assert.fail("invalid record id");
  }
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
  switch ((record.get("id") as Buffer).toString("utf8")) {
    case "v4":
      content.unshift(v4.sign(privateKey, RLP.encode(content)));
      break;
    default:
      assert.fail("invalid record id");
  }
  const encoded = RLP.encode(content);
  assert(encoded.length < MAX_RECORD_SIZE, "ENR must be less than 300 bytes");
  return encoded;
}

export function encodeTxt(record: ENR, privateKey: PrivateKey, seq: SequenceNumber): string {
  return "enr:" + base64url.encode(Buffer.from(encode(record, privateKey, seq)));
}
