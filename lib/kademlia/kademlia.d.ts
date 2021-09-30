import { Bucket } from "./bucket";
import { EntryStatus, IEntryFull, BucketEventEmitter } from "./types";
import { NodeId, ENR } from "../enr";
declare const KademliaRoutingTable_base: new () => BucketEventEmitter;
/**
 * A Kademlia routing table, for storing ENRs based on their NodeIds
 *
 * ENRs are assigned to buckets based on their distance to the local NodeId
 * Each entry maintains a 'status', either connected or disconnected
 * Each bucket maintains a pending entry which may either
 * take the place of the oldest disconnected entry in the bucket
 * or be dropped after a timeout.
 */
export declare class KademliaRoutingTable extends KademliaRoutingTable_base {
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
    constructor(localId: NodeId, k: number);
    isEmpty(): boolean;
    add(value: ENR, status?: EntryStatus): boolean;
    clear(): void;
    removeById(id: NodeId): ENR | undefined;
    remove(value: ENR): ENR | undefined;
    updateValue(value: ENR): boolean;
    updateStatus(id: NodeId, status: EntryStatus): boolean;
    update(value: ENR, status: EntryStatus): boolean;
    /**
     * Gets the ENR if stored, does not include pending values
     */
    getValue(id: NodeId): ENR | undefined;
    /**
     * Gets the IEntryFull if stored, includes pending values
     */
    getWithPending(id: NodeId): IEntryFull<ENR> | undefined;
    nearest(id: NodeId, limit: number): ENR[];
    valuesOfDistance(value: number): ENR[];
    values(): ENR[];
    random(): ENR | undefined;
    private bucketForValue;
    private bucketForId;
}
export {};
