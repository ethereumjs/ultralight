import sha256 = require("bcrypto/lib/sha256");

import { Tag } from "../packet";
import { ENR } from "./enr";
import { NodeId } from "./types";
import { fromHex } from "../util";
import { createNodeId } from "./create";

// calculate node id / tag

export function getSrcId(enr: ENR, tag: Tag): NodeId {
  const hash = sha256.digest(fromHex(enr.nodeId));
  // reuse `hash` buffer for output
  for (let i = 0; i < 32; i++) {
    hash[i] = hash[i] ^ tag[i];
  }
  return createNodeId(hash);
}

export function getTag(enr: ENR, dstId: NodeId): Tag {
  const nodeId = fromHex(enr.nodeId);
  const hash = sha256.digest(fromHex(dstId));
  // reuse `hash` buffer for output
  for (let i = 0; i < 32; i++) {
    hash[i] = hash[i] ^ nodeId[i];
  }
  return hash;
}
