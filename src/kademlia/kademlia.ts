import * as Collections from "typescript-collections";

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
    if (xor == 0 ) {
      distance -= 8;
    } else {
      distance -= (numberOfLeadingZeros(xor) - 24);
      break;
    }
    i++;
  }
  return distance;
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
export class KademliaRoutingTable<T> implements Set<T> {

  selfId: Buffer;
  k: number;
  maxReplacements: number;
  nodeId: (entry: T) => Buffer;
  readonly [Symbol.toStringTag]: string;
  size: number;
  fakeArray: Set<T> = new Set<T>();
  buckets: Collections.LinkedList<T>[];
  distanceFn: (a: Buffer, b: Buffer) => number;

  /**
   * Create a new routing table.
   *
   * @param selfId the ID of the local node
   * @param k the size of each bucket (k value)
   * @param maxReplacements the maximum number of replacements to cache in each bucket
   * @param nodeId a function for obtaining the id of a network node
   * @param distanceFn a function dictating the distance between nodes
   * @return A new routing table
   */
  constructor(selfId: Buffer, k: number, maxReplacements: number, nodeId: (entry: T) => Buffer, distanceFn = xorDist) {
    if (selfId.length == 0) {
      throw "selfId cannot be empty";
    }
    if (k <= 0) {
      throw "k must be positive";
    }
    if (maxReplacements < 0) {
      throw "maxReplacements must be positive or zero";
    }
    this.selfId = selfId;
    this.k = k;
    this.maxReplacements = maxReplacements;
    this.nodeId = nodeId;
    this.size = 0;
    this.buckets = new Array<Collections.LinkedList<T>>(selfId.length + 1);
    this.distanceFn = distanceFn;
  }

  isEmpty(): boolean {
    return this.size == 0;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.fakeArray[Symbol.iterator]();
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
    this.fakeArray.clear();
  }

  delete(value: T): boolean {
    const bucket = this.bucketFor(value);
    if (!bucket.remove(value)) {
      return false;
    }
    this.size -= 1;
    return true;
  }

  entries(): IterableIterator<[T, T]> {
    return this.fakeArray.entries();
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    return this.fakeArray.forEach(callbackfn, thisArg);
  }

  has(value: T): boolean {
    const bucket = this.bucketFor(value);
    return bucket.indexOf(value) != -1;
  }

  keys(): IterableIterator<T> {
    return this.fakeArray.keys();
  }

  values(): IterableIterator<T> {
    return this.fakeArray.values();
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