import * as Collections from "typescript-collections";
import {LinkedList} from "typescript-collections";

/**
 * Computes the number of zero bits of the XOR computation between two byte arrays.
 * @param a the first byte array
 * @param b the second byte array
 */
export function xorDist(a: Buffer, b: Buffer): number {
  if (a.length != b.length) {
    throw "arrays are of different lengths";
  }
  let distance = a.length * 8;
  let i = 0;
  while (i < a.length) {
    const xor = a[i] ^ b[i];
    if (xor == 0) {
      distance -= 8;
    } else {
      distance -= (numberOfLeadingZeros(xor) - 24);
      break;
    }
    i++;
  }
  return distance;
}

/**
 * Compare two equal-length byte arrays for their XOR-distance to a target array.
 *
 * @param target the target array to compare against.
 * @param a the first byte array
 * @param b the second byte array
 * @return -1 if [a] is closer, +1 if [b] is closer, or 0 if they are the same distance to the target array
 * @throws if [a] or [b] are not the same length as the target array
 */
export function xorDistCmp(target: Buffer, a: Buffer, b: Buffer): number {
  if (target.length != a.length || a.length != b.length) {
    throw "arrays are of different lengths";
  }
  for (let i = 0 ; i < a.length ; i++) {
    const distA = target[i] ^ a[i];
    const distB = target[i] ^ b[i];
    if (distA > distB) {
      return 1;
    } else if (distA < distB) {
      return -1;
    }
  }
  return 0;
}

function numberOfLeadingZeros(i: number): number {
  if (i <= 0)
    return i == 0 ? 32 : 0;
  let n = 31;
  if (i >= 1 << 16) { n -= 16; i >>>= 16; }
  if (i >= 1 <<  8) { n -=  8; i >>>=  8; }
  if (i >= 1 <<  4) { n -=  4; i >>>=  4; }
  if (i >= 1 <<  2) { n -=  2; i >>>=  2; }
  return n - (i >>> 1);
}

/**
 * A Kademlia routing table, organized with an identity and a number of buckets.
 *
 * Entities are assigned to buckets based on the distance function associated with Kademlia.
 */
export class KademliaRoutingTable<T> {

  selfId: Buffer;
  k: number;
  nodeId: (entry: T) => Buffer;
  readonly [Symbol.toStringTag]: string;
  size: number;
  buckets: Collections.LinkedList<T>[];
  distanceFn: (a: Buffer, b: Buffer) => number;

  /**
   * Create a new routing table.
   *
   * @param selfId the ID of the local node
   * @param k the size of each bucket (k value)
   * @param nodeId a function for obtaining the id of a network node
   * @param distanceFn a function dictating the distance between nodes
   * @return A new routing table
   */
  constructor(selfId: Buffer, k: number,  nodeId: (entry: T) => Buffer, distanceFn = xorDist) {
    if (selfId.length == 0) {
      throw "selfId cannot be empty";
    }
    if (k <= 0) {
      throw "k must be positive";
    }
    this.selfId = selfId;
    this.k = k;
    this.nodeId = nodeId;
    this.size = 0;
    this.buckets = new Array<Collections.LinkedList<T>>(selfId.length + 1);
    this.distanceFn = distanceFn;
  }

  isEmpty(): boolean {
    return this.size == 0;
  }

  propose(value: T): (T | undefined) {
    const bucket = this.bucketFor(value);
    if (bucket.size() < this.k) {
      bucket.add(value);
      this.size +=1;
      return undefined;
    } else {
      return bucket.first();
    }
  }

  add(value: T): this {
    this.propose(value);
    return this;
  }

  clear(): void {
    this.buckets = new Array<Collections.LinkedList<T>>(this.selfId.length + 1);
    this.size = 0;
  }

  evict(value: T): boolean {
    const bucket = this.bucketFor(value);
    if (!bucket.remove(value)) {
      return false;
    }
    this.size -= 1;
    return true;
  }

  has(value: T): boolean {
    const bucket = this.bucketFor(value);
    return bucket.indexOf(value) != -1;
  }

  nearest(value: T, limit: number): T[] {
    const results = new Array<T>();
    this.buckets.forEach(bucket => {
      results.push(...bucket.toArray());
    });
    const valueId = this.nodeId(value);
    results.sort((a: T, b: T) => {
      return xorDistCmp(valueId, this.nodeId(a), this.nodeId((b)));
    });
    return results.slice(0, limit);
  }

  peersOfDistance(value: number): T[] {
    const bucket = this.buckets[value];
    return bucket === undefined ? [] : bucket.toArray();
  }

  random(): (T | undefined) {
    const nonEmptyBuckets = this.buckets.filter(bucket => !bucket.isEmpty());
    if (nonEmptyBuckets.length == 0) {
      return undefined;
    }
    const selectedBucket = nonEmptyBuckets[Math.floor(Math.random() * nonEmptyBuckets.length)];
    return selectedBucket.elementAtIndex(Math.floor(Math.random() * selectedBucket.size()));
  }

  private bucketFor(value: T): Collections.LinkedList<T> {
    const bucketId = this.distanceFn(this.selfId, this.nodeId(value));
    const bucket = this.buckets[bucketId];
    if (bucket === undefined) {
      const newBucket = new Collections.LinkedList<T>();
      this.buckets[bucketId] = newBucket;
      return newBucket;
    }
    return bucket;
  }
}