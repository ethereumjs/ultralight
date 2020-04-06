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

/**
 * Calculates the log2 distance for a destination given a target and current iteration
 * As the iteration increases, the distance is incremented / decremented to adjacent distances from the exact distance
 */
export function findNodeLog2Distance(a: NodeId, b: ILookupPeer): number {
  const d = log2Distance(a, b.nodeId);
  const iteration = b.iteration;
  if (b.iteration === 1) {
    return d;
  }
  let difference = 1;
  const results = [d];
  while (results.length < iteration) {
    if (d + difference <= 256) {
      results.push(d + difference);
    }
    if (d - difference > 0) {
      results.push(d - difference);
    }
    difference += 1;
  }
  if (iteration % 2 === 1) {
    results.pop();
  }
  return results.pop() as number;
}
