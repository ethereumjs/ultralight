import { ENR, NodeId } from "../enr";
import { BucketEventEmitter, EntryStatus, IEntry, IEntryFull } from "./types";
declare const Bucket_base: new () => BucketEventEmitter;
export declare class Bucket extends Bucket_base {
    private k;
    /**
     * Entries ordered from least-recently connected to most-recently connected
     */
    private bucket;
    private pending;
    private pendingTimeout;
    private pendingTimeoutId;
    constructor(k: number, pendingTimeout: number);
    /**
     * Remove all entries, including any pending entry
     */
    clear(): void;
    /**
     * The number of entries in the bucket
     */
    size(): number;
    /**
     * Returns true when there are no entries in the bucket
     */
    isEmpty(): boolean;
    /**
     * Return the first index in the bucket with a `Connected` status (or -1 if none exist)
     */
    firstConnectedIndex(): number;
    /**
     * Attempt to add an ENR with a status to the bucket
     *
     * If this entry's status is connected, the bucket is full, and there are disconnected entries in the bucket,
     * set this new entry as a pending entry
     *
     * Returns true if the entry is successfully inserted into the bucket. (excludes pending)
     */
    add(value: ENR, status: EntryStatus): boolean;
    addConnected(value: ENR): boolean;
    addDisconnected(value: ENR): boolean;
    /**
     * Update an existing entry (ENR)
     */
    updateValue(value: ENR): boolean;
    /**
     * Update the status of an existing entry
     */
    updateStatus(id: NodeId, status: EntryStatus): boolean;
    /**
     * Update both the value and status of an existing entry
     */
    update(value: ENR, status: EntryStatus): boolean;
    /**
     * Attempt to add an entry as a "pending" entry
     *
     * This will trigger a "pendingEviction" event with the entry which should be updated
     * and a callback to `applyPending` to evict the first disconnected entry, should one exist at the time.
     */
    addPending(value: ENR, status: EntryStatus): boolean;
    applyPending: () => void;
    /**
     * Get an entry from the bucket, if it exists
     */
    get(id: NodeId): IEntry<ENR> | undefined;
    /**
     * Get an entry from the bucket if it exists
     * Also check the pending entry
     *
     * Return an entry with an additional property marking if the entry was the pending entry
     */
    getWithPending(id: NodeId): IEntryFull<ENR> | undefined;
    /**
     * Return the value of an entry if it exists in the bucket
     */
    getValue(id: NodeId): ENR | undefined;
    /**
     * Get a value from the bucket by index
     */
    getValueByIndex(index: number): ENR;
    /**
     * Remove a value from the bucket by index
     */
    removeByIndex(index: number): ENR;
    /**
     * Remove a value from the bucket by NodeId
     */
    removeById(id: NodeId): ENR | undefined;
    /**
     * Remove an ENR from the bucket
     */
    remove(value: ENR): ENR | undefined;
    /**
     * Return the bucket values as an array
     */
    values(): ENR[];
}
export {};
