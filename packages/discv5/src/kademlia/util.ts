import { toBigIntBE } from "bigint-buffer";

import { NodeId } from "../enr";
import { fromHex } from "../util";
import { NUM_BUCKETS } from "./constants";

/**
 * Computes the xor distance between two NodeIds
 */
export function distance(a: NodeId, b: NodeId): bigint {
  return toBigIntBE(fromHex(a)) ^ toBigIntBE(fromHex(b));
}

export function log2Distance(a: NodeId, b: NodeId): number {
  let firstMatch = 0;
  for (let i = 0; i < a.length; i++) {
    const xoredNibble = Number.parseInt(a[i], 16) ^ Number.parseInt(b[i], 16);
    if (xoredNibble) {
      if (xoredNibble & 0b1000) {
        firstMatch += 0;
      } else if (xoredNibble & 0b0100) {
        firstMatch += 1;
      } else if (xoredNibble & 0b0010) {
        firstMatch += 2;
      } else if (xoredNibble & 0b0001) {
        firstMatch += 3;
      }
      break;
    } else {
      firstMatch += 4;
    }
  }

  return NUM_BUCKETS - firstMatch;
}

/**
 * Calculates the log2 distances for a destination given a target and number of distances to request
 * As the size increases, the distance is incremented / decremented to adjacent distances from the exact distance
 */
export function findNodeLog2Distances(a: NodeId, b: NodeId, size: number): number[] {
  if (size <= 0) {
    throw new Error("Iterations must be greater than 0");
  }
  if (size > 127) {
    throw new Error("Iterations cannot be greater than 127");
  }
  let d = log2Distance(a, b);
  if (d === 0) {
    d = 1;
  }
  const results = [d];
  let difference = 1;
  while (results.length < size) {
    if (d + difference <= 256) {
      results.push(d + difference);
    }
    if (d - difference > 0) {
      results.push(d - difference);
    }
    difference += 1;
  }
  return results.slice(0, size);
}
