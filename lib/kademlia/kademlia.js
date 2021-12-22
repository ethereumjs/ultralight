"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KademliaRoutingTable = void 0;
const events_1 = require("events");
const bucket_1 = require("./bucket");
const types_1 = require("./types");
const constants_1 = require("./constants");
const util_1 = require("./util");
/**
 * A Kademlia routing table, for storing ENRs based on their NodeIds
 *
 * ENRs are assigned to buckets based on their distance to the local NodeId
 * Each entry maintains a 'status', either connected or disconnected
 * Each bucket maintains a pending entry which may either
 * take the place of the oldest disconnected entry in the bucket
 * or be dropped after a timeout.
 */
class KademliaRoutingTable extends events_1.EventEmitter {
    /**
     * Create a new routing table.
     *
     * @param localId the ID of the local node
     * @param k the size of each bucket (k value)
     */
    constructor(localId, k) {
        super();
        if (k <= 0) {
            throw new Error("k must be positive");
        }
        this.localId = localId;
        this.k = k;
        this.size = 0;
        this.buckets = Array.from({ length: constants_1.NUM_BUCKETS }, () => new bucket_1.Bucket(this.k, constants_1.PENDING_TIMEOUT));
        this.buckets.forEach((bucket) => {
            bucket.on("pendingEviction", (enr) => this.emit("pendingEviction", enr));
            bucket.on("appliedEviction", (inserted, evicted) => this.emit("appliedEviction", inserted, evicted));
        });
    }
    isEmpty() {
        return this.size == 0;
    }
    add(value, status = types_1.EntryStatus.Disconnected) {
        const bucket = this.bucketForValue(value);
        const added = bucket.add(value, status);
        if (added) {
            this.size += 1;
        }
        return added;
    }
    clear() {
        this.buckets.forEach((bucket) => bucket && bucket.clear());
        this.size = 0;
    }
    removeById(id) {
        const bucket = this.bucketForId(id);
        const removed = bucket.removeById(id);
        if (removed) {
            this.size -= 1;
        }
        return removed;
    }
    remove(value) {
        const bucket = this.bucketForValue(value);
        const removed = bucket.remove(value);
        if (removed) {
            this.size -= 1;
        }
        return removed;
    }
    updateValue(value) {
        const bucket = this.bucketForValue(value);
        return bucket.updateValue(value);
    }
    updateStatus(id, status) {
        const bucket = this.bucketForId(id);
        return bucket.updateStatus(id, status);
    }
    update(value, status) {
        const bucket = this.bucketForValue(value);
        return bucket.update(value, status);
    }
    /**
     * Gets the ENR if stored, does not include pending values
     */
    getValue(id) {
        const bucket = this.bucketForId(id);
        return bucket.getValue(id);
    }
    /**
     * Gets the IEntryFull if stored, includes pending values
     */
    getWithPending(id) {
        const bucket = this.bucketForId(id);
        return bucket.getWithPending(id);
    }
    nearest(id, limit) {
        const results = [];
        this.buckets.forEach((bucket) => {
            results.push(...bucket.values());
        });
        results.sort((a, b) => {
            return util_1.log2Distance(id, a.nodeId) - util_1.log2Distance(id, b.nodeId);
        });
        return results.slice(0, limit);
    }
    valuesOfDistance(value) {
        const bucket = this.buckets[value - 1];
        return bucket === undefined ? [] : bucket.values();
    }
    values() {
        return this.buckets
            .filter((bucket) => !bucket.isEmpty())
            .map((bucket) => bucket.values())
            .flat();
    }
    random() {
        const nonEmptyBuckets = this.buckets.filter((bucket) => !bucket.isEmpty());
        if (nonEmptyBuckets.length == 0) {
            return undefined;
        }
        const selectedBucket = nonEmptyBuckets[Math.floor(Math.random() * nonEmptyBuckets.length)];
        return selectedBucket.getValueByIndex(Math.floor(Math.random() * selectedBucket.size()));
    }
    bucketForValue(value) {
        return this.bucketForId(value.nodeId);
    }
    bucketForId(id) {
        const bucketId = util_1.log2Distance(this.localId, id) - 1;
        return this.buckets[bucketId];
    }
}
exports.KademliaRoutingTable = KademliaRoutingTable;
