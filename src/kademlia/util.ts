import { toBigIntBE } from "bigint-buffer";

import { NodeId } from "../enr";
import { ILookupPeer } from "./types";
import { fromHex } from "../util";
import { NUM_BUCKETS } from "./constants";

/**
 * Computes the xor distance between two NodeIds
 */
export function distance(a: NodeId, b: NodeId): bigint {
  return toBigIntBE(fromHex(a)) ^ toBigIntBE(fromHex(b));
}

export function log2Distance(a: NodeId, b: NodeId): number {
  const d = distance(a, b);
  if (!d) {
    return 0;
  }
  return NUM_BUCKETS - d.toString(2).padStart(NUM_BUCKETS, "0").indexOf("1");
}

export function findNodeLog2Distance(a: NodeId, b: ILookupPeer): number {
  return log2Distance(a, b.nodeId);
}
