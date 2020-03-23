import { EventEmitter } from "events";

import { Bucket } from "./bucket";
import { EntryStatus, IEntryFull, BucketEventEmitter }  from "./types";
import { NodeId, ENR } from "../enr";
import { NUM_BUCKETS, PENDING_TIMEOUT } from "./constants";
import { log2Distance } from "./util";

/**
 * A Kademlia routing table, for storing ENRs based on their NodeIds
 *
 * ENRs are assigned to buckets based on their distance to the local NodeId
 * Each entry maintains a 'status', either connected or disconnected
 * Each bucket maintains a pending entry which may either
 * take the place of the oldest disconnected entry in the bucket
 * or be dropped after a timeout.
 */
export class KademliaRoutingTable extends (EventEmitter as { new(): BucketEventEmitter }) {

  localId: NodeId;
  k: number;
  size: number;
  buckets: Bucket[];

  /**
   * Create a new routing table.
   *
   * @param localId the ID of the local node
   * @param k the size of each bucket (k value)
   */
  constructor(localId: NodeId, k: number) {
    super();
    if (k <= 0) {
      throw new Error("k must be positive");
    }
    this.localId = localId;
    this.k = k;
    this.size = 0;
    this.buckets = Array.from({ length: NUM_BUCKETS }, () => new Bucket(this.k, PENDING_TIMEOUT));
    this.buckets.forEach((bucket) => {
      bucket.on("pendingEviction", (enr: ENR) => this.emit("pendingEviction", enr));
      bucket.on("appliedEviction", (inserted: ENR, evicted?: ENR) => this.emit("appliedEviction", inserted, evicted));
    });
  }

  isEmpty(): boolean {
    return this.size == 0;
  }

  add(value: ENR, status: EntryStatus = EntryStatus.Disconnected): boolean {
    const bucket = this.bucketForValue(value);
    const added = bucket.add(value, status);
    if (added) {
      this.size += 1;
    }
    return added;
  }

  clear(): void {
    this.buckets.forEach((bucket) => bucket && bucket.clear());
    this.size = 0;
  }

  removeById(id: NodeId): ENR | undefined {
    const bucket = this.bucketForId(id);
    const removed = bucket.removeById(id);
    if (removed) {
      this.size -= 1;
    }
    return removed;
  }

  remove(value: ENR): ENR | undefined {
    const bucket = this.bucketForValue(value);
    const removed = bucket.remove(value);
    if (removed) {
      this.size -= 1;
    }
    return removed;
  }

  updateValue(value: ENR): boolean {
    const bucket = this.bucketForValue(value);
    return bucket.updateValue(value);
  }

  updateStatus(id: NodeId, status: EntryStatus): boolean {
    const bucket = this.bucketForId(id);
    return bucket.updateStatus(id, status);
  }

  update(value: ENR, status: EntryStatus): boolean {
    const bucket = this.bucketForValue(value);
    return bucket.update(value, status);
  }


  /**
   * Gets the ENR if stored, does not include pending values
   */
  getValue(id: NodeId): ENR | undefined {
    const bucket = this.bucketForId(id);
    return bucket.getValue(id);
  }

  /**
   * Gets the IEntryFull if stored, includes pending values
   */
  getWithPending(id: NodeId): IEntryFull<ENR> | undefined {
    const bucket = this.bucketForId(id);
    return bucket.getWithPending(id);
  }

  nearest(id: NodeId, limit: number): ENR[] {
    const results: ENR[] = [];
    this.buckets.forEach(bucket => {
      results.push(...bucket.values());
    });
    results.sort((a, b) => {
      return log2Distance(id, a.nodeId) - log2Distance(id, b.nodeId);
    });
    return results.slice(0, limit);
  }

  valuesOfDistance(value: number): ENR[] {
    const bucket = this.buckets[value];
    return bucket === undefined ? [] : bucket.values();
  }

  values(): ENR[] {
    return this.buckets
      .filter(bucket => !bucket.isEmpty())
      .map(bucket => bucket.values())
      .flat();
  }

  random(): ENR | undefined {
    const nonEmptyBuckets = this.buckets.filter(bucket => !bucket.isEmpty());
    if (nonEmptyBuckets.length == 0) {
      return undefined;
    }
    const selectedBucket = nonEmptyBuckets[Math.floor(Math.random() * nonEmptyBuckets.length)];
    return selectedBucket.getValueByIndex(Math.floor(Math.random() * selectedBucket.size()));
  }

  private bucketForValue(value: ENR): Bucket {
    return this.bucketForId(value.nodeId);
  }

  private bucketForId(id: NodeId): Bucket {
    const bucketId = log2Distance(this.localId, id) - 1;
    return this.buckets[bucketId];
  }
}
