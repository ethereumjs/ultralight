import { EventEmitter } from "events";

import { ENR, NodeId } from "../enr";
import { MAX_NODES_PER_BUCKET } from "./constants";
import { BucketEventEmitter, EntryStatus, IEntry, IEntryFull, InsertResult, UpdateResult } from "./types";

export class Bucket extends (EventEmitter as { new (): BucketEventEmitter }) {
  /**
   * Entries ordered from least-recently connected to most-recently connected
   */
  private nodes: IEntry<ENR>[];

  /**
   * The position (index) in `nodes`
   * Since the entries in `nodes` are ordered from least-recently connected to
   * most-recently connected, all entries above this index are also considered
   * connected, i.e. the range `[0, firstConnectedIndex)` marks the sub-list of entries
   * that are considered disconnected and the range
   * `[firstConnectedIndex, MAX_NODES_PER_BUCKET)` marks sub-list of entries that are
   * considered connected.
   *
   * `undefined` indicates that there are no connected entries in the bucket, i.e.
   * the bucket is either empty, or contains only entries for peers that are
   * considered disconnected.
   */
  private firstConnectedIndex?: number;

  /**
   * A node that is pending to be inserted into a full bucket, should the
   * least-recently connected (and currently disconnected) node not be
   * marked as connected within `pendingTimeout`.
   */
  private pending: IEntry<ENR> | undefined;

  /**
   * The timeout window before a new pending node is eligible for insertion,
   * if the least-recently connected node is not updated as being connected
   * in the meantime.
   */
  private pendingTimeout: number;

  private pendingTimeoutId: NodeJS.Timeout | undefined;

  constructor(pendingTimeout: number) {
    super();
    this.nodes = [];
    this.pendingTimeout = pendingTimeout;
  }

  /**
   * Remove all entries, including any pending entry
   */
  clear(): void {
    this.nodes = [];
    this.pending = undefined;
    clearTimeout((this.pendingTimeoutId as unknown) as NodeJS.Timeout);
  }

  /**
   * The number of entries in the bucket
   */
  size(): number {
    return this.nodes.length;
  }

  /**
   * Returns true when there are no entries in the bucket
   */
  isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  /**
   * Attempt to add an ENR with a status to the bucket
   *
   * If this entry's status is connected, the bucket is full, and there are disconnected entries in the bucket,
   * set this new entry as a pending entry
   */
  add(value: ENR, status: EntryStatus): InsertResult {
    // Prevent inserting duplicate nodes.
    if (this.get(value.nodeId)) {
      return InsertResult.NodeExists;
    }

    const isPendingNode = this.pending?.value.nodeId === value.nodeId;

    switch (status) {
      case EntryStatus.Connected: {
        if (this.nodes.length < MAX_NODES_PER_BUCKET) {
          this.firstConnectedIndex = this.firstConnectedIndex ?? this.nodes.length;
          this.nodes.push({ value, status });
          break;
        } else {
          // The bucket is full, attempt to add the node as pending
          if (this.addPending(value, status)) {
            return InsertResult.Pending;
          } else {
            return InsertResult.FailedBucketFull;
          }
        }
      }
      case EntryStatus.Disconnected: {
        if (this.nodes.length < MAX_NODES_PER_BUCKET) {
          if (this.firstConnectedIndex === undefined) {
            // No connected nodes, add to the end
            this.nodes.push({ value, status });
          } else {
            // add before the first connected node
            this.nodes.splice(this.firstConnectedIndex, 0, { value, status });
            this.firstConnectedIndex++;
          }
          break;
        } else {
          // The bucket is full
          return InsertResult.FailedBucketFull;
        }
      }
    }

    // If we inserted the node, make sure there is no pending node of the same key. This can
    // happen when a pending node is inserted, a node gets removed from the bucket, freeing up
    // space and then re-inserted here.
    if (isPendingNode) {
      delete this.pending;
    }
    return InsertResult.Inserted;
  }

  /**
   * Updates the value of the node referred to by the given key, if it is in the bucket.
   * If the node is not in the bucket, returns an update result indicating the outcome.
   * NOTE: This does not update the position of the node in the table.
   */
  updateValue(value: ENR): UpdateResult {
    const node = this.nodes.find((entry) => entry.value.nodeId === value.nodeId);
    if (node) {
      // use seq numbers to determine whether to update the value
      if (value.seq > node.value.seq) {
        node.value = value;
        return UpdateResult.Updated;
      } else {
        return UpdateResult.NotModified;
      }
    } else if (this.pending?.value.nodeId === value.nodeId) {
      this.pending.value = value;
      return UpdateResult.UpdatedPending;
    } else {
      return UpdateResult.FailedKeyNonExistant;
    }
  }

  /**
   * Updates the status of the node referred to by the given key, if it is in the bucket.
   * If the node is not in the bucket, returns an update result indicating the outcome.
   */
  updateStatus(id: NodeId, status: EntryStatus): UpdateResult {
    // Remove the node from its current position and then reinsert it
    // with the desired status, which puts it at the end of either the
    // prefix list of disconnected nodes or the suffix list of connected
    // nodes (i.e. most-recently disconnected or most-recently connected,
    // respectively).
    const index = this.nodes.findIndex((entry) => entry.value.nodeId === id);
    if (index !== -1) {
      // Remove the node from its current position.
      const node = this.removeByIndex(index);

      const oldStatus = node.status;

      // Flag indicating if this update modified the entry
      const notModified = oldStatus === status;
      // Flags indicating we are upgrading to a connected status
      const wasConnected = oldStatus === EntryStatus.Connected;
      const isConnected = status === EntryStatus.Connected;

      // If the least-recently connected node re-establishes its
      // connected status, drop the pending node.
      if (index === 0 && isConnected) {
        delete this.pending;
      }

      // Reinsert the node with the desired status
      switch (this.add(node.value, status)) {
        case InsertResult.Inserted: {
          if (notModified) {
            return UpdateResult.NotModified;
          } else if (!wasConnected && isConnected) {
            return UpdateResult.UpdatedAndPromoted;
          } else {
            return UpdateResult.Updated;
          }
        }
        default:
          throw new Error("Unreachable");
      }
    } else if (this.pending?.value.nodeId === id) {
      this.pending.status = status;
      return UpdateResult.UpdatedPending;
    } else {
      return UpdateResult.FailedKeyNonExistant;
    }
  }

  /**
   * Attempt to add an entry as a "pending" entry
   *
   * This will trigger a "pendingEviction" event with the entry which should be updated
   * and a callback to `applyPending` to evict the first disconnected entry, should one exist at the time.
   */
  addPending(value: ENR, status: EntryStatus): boolean {
    if (!this.pending && this.firstConnectedIndex !== 0) {
      this.pending = { value, status };
      const first = this.nodes[0];
      this.emit("pendingEviction", first.value);
      this.pendingTimeoutId = setTimeout(this.applyPending, this.pendingTimeout);
      return true;
    }
    return false;
  }

  applyPending = (): void => {
    if (this.pending) {
      // If the bucket is full with connected nodes, drop the pending node
      if (this.firstConnectedIndex === 0) {
        this.pending = undefined;
        return;
      }
      // else the first entry can be removed and the pending can be added
      const evicted = this.removeByIndex(0);
      const inserted = this.pending.value;
      this.add(this.pending.value, this.pending.status);
      this.pending = undefined;
      this.emit("appliedEviction", inserted, evicted.value);
    }
  };

  /**
   * Get an entry from the bucket, if it exists
   */
  get(id: NodeId): IEntry<ENR> | undefined {
    const entry = this.nodes.find((entry) => entry.value.nodeId === id);
    if (entry) {
      return entry;
    }
    return undefined;
  }

  /**
   * Get an entry from the bucket if it exists
   * Also check the pending entry
   *
   * Return an entry with an additional property marking if the entry was the pending entry
   */
  getWithPending(id: NodeId): IEntryFull<ENR> | undefined {
    const bucketEntry = this.get(id);
    if (bucketEntry) {
      return { pending: false, ...bucketEntry };
    }
    if (this.pending && this.pending.value.nodeId === id) {
      return { pending: true, ...this.pending };
    }
    return undefined;
  }

  /**
   * Return the value of an entry if it exists in the bucket
   */
  getValue(id: NodeId): ENR | undefined {
    const entry = this.get(id);
    if (entry) {
      return entry.value;
    }
    return undefined;
  }

  /**
   * Get a value from the bucket by index
   */
  getValueByIndex(index: number): ENR {
    if (index >= this.nodes.length) {
      throw new Error(`Invalid index in bucket: ${index}`);
    }
    return this.nodes[index].value;
  }

  /**
   * Remove a value from the bucket by index
   */
  removeByIndex(index: number): IEntry<ENR> {
    if (index >= this.nodes.length) {
      throw new Error(`Invalid index in bucket: ${index}`);
    }
    // Remove the entry
    const entry = this.nodes.splice(index, 1)[0];

    // Update firstConnectedIndex
    switch (entry.status) {
      case EntryStatus.Connected: {
        if (this.firstConnectedIndex === index && index === this.nodes.length) {
          // It was the last connected node.
          delete this.firstConnectedIndex;
        }
        break;
      }
      case EntryStatus.Disconnected: {
        this.firstConnectedIndex =
          this.firstConnectedIndex === undefined ? this.firstConnectedIndex : this.firstConnectedIndex - 1;
      }
    }

    return entry;
  }

  /**
   * Remove a value from the bucket by NodeId
   */
  removeById(id: NodeId): IEntry<ENR> | undefined {
    const index = this.nodes.findIndex((entry) => entry.value.nodeId === id);
    if (index === -1) {
      return undefined;
    }
    return this.removeByIndex(index);
  }

  /**
   * Remove an ENR from the bucket
   */
  remove(value: ENR): IEntry<ENR> | undefined {
    return this.removeById(value.nodeId);
  }

  /**
   * Return the bucket values as an array
   */
  values(): ENR[] {
    return this.nodes.map((entry) => entry.value);
  }

  /**
   * Return the raw nodes as an array
   */
  rawValues(): IEntry<ENR>[] {
    return this.nodes;
  }
}
