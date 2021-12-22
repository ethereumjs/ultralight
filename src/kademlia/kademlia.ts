import { EventEmitter } from "events";

import { Bucket } from "./bucket";
import { EntryStatus, IEntryFull, BucketEventEmitter, IEntry, InsertResult } from "./types";
import { NodeId, ENR } from "../enr";
import { NUM_BUCKETS, PENDING_TIMEOUT } from "./constants";
import { log2Distance } from "./util";
import { UpdateResult } from ".";

/**
 * A Kademlia routing table, for storing ENRs based on their NodeIds
 *
 * ENRs are assigned to buckets based on their distance to the local NodeId
 * Each entry maintains a 'status', either connected or disconnected
 * Each bucket maintains a pending entry which may either
 * take the place of the oldest disconnected entry in the bucket
 * or be dropped after a timeout.
 */
export class KademliaRoutingTable extends (EventEmitter as { new (): BucketEventEmitter }) {
  localId: NodeId;
  buckets: Bucket[];

  /**
   * Create a new routing table.
   *
   * @param localId the ID of the local node
   * @param k the size of each bucket (k value)
   */
  constructor(localId: NodeId) {
    super();
    this.localId = localId;
    this.buckets = Array.from({ length: NUM_BUCKETS }, () => new Bucket(PENDING_TIMEOUT));
    this.buckets.forEach((bucket) => {
      bucket.on("pendingEviction", (enr: ENR) => this.emit("pendingEviction", enr));
      bucket.on("appliedEviction", (inserted: ENR, evicted?: ENR) => this.emit("appliedEviction", inserted, evicted));
    });
  }

  get size(): number {
    return this.buckets.reduce((acc, bucket) => acc + bucket.size(), 0);
  }

  isEmpty(): boolean {
    return this.size == 0;
  }

  clear(): void {
    this.buckets.forEach((bucket) => bucket && bucket.clear());
  }

  /**
   * Removes a node from the routing table.
   *
   * Returns the entry if it existed.
   */
  removeById(id: NodeId): IEntry<ENR> | undefined {
    const bucket = this.bucketForId(id);
    return bucket.removeById(id);
  }

  /**
   * Removes a node from the routing table.
   *
   * Returns the entry if it existed.
   */
  remove(value: ENR): IEntry<ENR> | undefined {
    const bucket = this.bucketForValue(value);
    return bucket.remove(value);
  }

  /**
   * Updates a node's status if it exists in the table.
   */
  updateStatus(id: NodeId, status: EntryStatus): UpdateResult {
    if (this.localId === id) {
      return UpdateResult.NotModified;
    }
    const bucket = this.bucketForId(id);
    return bucket.updateStatus(id, status);
  }

  /**
   * Updates a node's value if it exists in the table.
   *
   * Optionally the connection state can be modified.
   */
  update(value: ENR, status?: EntryStatus): UpdateResult {
    if (this.localId === value.nodeId) {
      return UpdateResult.NotModified;
    }
    const bucket = this.bucketForValue(value);

    const updateResult = bucket.updateValue(value);
    switch (updateResult) {
      case UpdateResult.FailedBucketFull:
      case UpdateResult.FailedKeyNonExistant:
        return updateResult;
    }

    if (status === undefined) {
      return updateResult;
    }

    const statusResult = bucket.updateStatus(value.nodeId, status);
    switch (statusResult) {
      case UpdateResult.FailedBucketFull:
      case UpdateResult.FailedKeyNonExistant:
      case UpdateResult.UpdatedAndPromoted:
      case UpdateResult.UpdatedPending:
        return statusResult;
    }

    if (
      updateResult === UpdateResult.UpdatedPending ||
      (updateResult === UpdateResult.NotModified && statusResult === UpdateResult.NotModified)
    ) {
      return updateResult;
    } else {
      return UpdateResult.Updated;
    }
  }

  /**
   * Attempts to insert or update
   */
  insertOrUpdate(value: ENR, status: EntryStatus): InsertResult {
    const id = value.nodeId;
    if (this.localId === id) {
      return InsertResult.FailedInvalidSelfUpdate;
    }
    const bucket = this.bucketForValue(value);

    if (!bucket.get(id)) {
      return bucket.add(value, status);
    } else {
      // The node exists in the bucket
      // Attempt to update the status
      const updateStatus = bucket.updateStatus(id, status);

      // If there was a failure state, we'd return early
      // but the only failure we have is a full bucket (which can't happen here)

      // Attempt to update the value
      const updateValue = bucket.updateValue(value);

      if (updateValue === UpdateResult.Updated && updateStatus === UpdateResult.Updated) {
        return InsertResult.Updated;
      }

      if (updateValue === UpdateResult.Updated && updateStatus === UpdateResult.UpdatedAndPromoted) {
        return InsertResult.UpdatedAndPromoted;
      }

      if (
        (updateValue === UpdateResult.Updated && updateStatus === UpdateResult.NotModified) ||
        (updateValue === UpdateResult.Updated && updateStatus === UpdateResult.UpdatedPending)
      ) {
        return InsertResult.ValueUpdated;
      }

      if (updateValue === UpdateResult.NotModified && updateStatus === UpdateResult.Updated) {
        return InsertResult.StatusUpdated;
      }

      if (updateValue === UpdateResult.NotModified && updateStatus === UpdateResult.UpdatedAndPromoted) {
        return InsertResult.StatusUpdatedAndPromoted;
      }

      if (updateValue === UpdateResult.NotModified && updateStatus === UpdateResult.NotModified) {
        return InsertResult.Updated;
      }

      if (updateValue === UpdateResult.UpdatedPending && updateStatus === UpdateResult.UpdatedPending) {
        return InsertResult.UpdatedPending;
      }

      throw new Error("Unreachable");
    }
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
    this.buckets.forEach((bucket) => {
      results.push(...bucket.values());
    });
    results.sort((a, b) => {
      return log2Distance(id, a.nodeId) - log2Distance(id, b.nodeId);
    });
    return results.slice(0, limit);
  }

  valuesOfDistance(value: number): ENR[] {
    const bucket = this.buckets[value - 1];
    return bucket === undefined ? [] : bucket.values();
  }

  values(): ENR[] {
    return this.buckets
      .filter((bucket) => !bucket.isEmpty())
      .map((bucket) => bucket.values())
      .flat();
  }

  rawValues(): IEntry<ENR>[] {
    return this.buckets
      .filter((bucket) => !bucket.isEmpty())
      .map((bucket) => bucket.rawValues())
      .flat();
  }

  random(): ENR | undefined {
    const nonEmptyBuckets = this.buckets.filter((bucket) => !bucket.isEmpty());
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
