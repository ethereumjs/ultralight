/// <reference types="node" />
import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { ENR, NodeId } from "../enr";
export interface IBucketEvents {
    /**
     * The least-recently connected enr that is currently considered disconnected and whose corresponding peer
     * should be checked for connectivity in order to prevent it from being evicted.
     *
     * If connectivity to the peer is re-established the corresponding entry should be updated with EntryStatus.Connected
     *
     * If this entry's status is not updated after some timeout, it will be evicted
     */
    pendingEviction: (enr: ENR) => void;
    /**
     * The result of applying a pending node to a bucket, possibly (most likely) replacing an existing node
     */
    appliedEviction: (inserted: ENR, evicted?: ENR) => void;
}
export declare type BucketEventEmitter = StrictEventEmitter<EventEmitter, IBucketEvents>;
export declare enum EntryStatus {
    Connected = 0,
    Disconnected = 1
}
export interface IEntry<T> {
    status: EntryStatus;
    value: T;
}
export interface IEntryFull<T> {
    status: EntryStatus;
    pending: boolean;
    value: T;
}
export interface ILookupConfig {
    /**
     * Allowed level of parallelism.
     *
     * The alpha parameter in the kademlia paper. The maximum number of peers that a query
     * is allowed to wait for in parallel while iterating towards the closes nodes to a target.
     *
     * Default is 3
     */
    lookupParallelism: number;
    /**
     * Number of results to produce.
     *
     * The number of closest peers that a query must obtain successful results for before it terminates.
     * Defaults to the maximum number of entries in a single kbucket.
     */
    lookupNumResults: number;
    /**
     * Maximum amount of time to spend on a single lookup
     *
     * Declared in milliseconds
     */
    lookupTimeout: number;
}
export interface ILookupEvents {
    peer: (peer: ILookupPeer) => void;
    finished: (closest: NodeId[]) => void;
}
export declare type LookupEventEmitter = StrictEventEmitter<EventEmitter, ILookupEvents>;
export declare enum LookupState {
    /**
     * The query is making progress by iterating towards `numResults` closest peers
     * to the target with a maximum of `parallelism` peers at a time
     */
    Iterating = 0,
    /**
     * A query is stalled when it did not make progress after `parallelism` consecutive
     * successful results.
     *
     * While the query is stalled, the maximum allowed parallelism for pending results
     * is increased to numResults in an attempt to finish the query.
     * If the query can make progress again upon receiving the remaining results,
     * it switches back to `Iterating`. Otherwise it will be finished.
     */
    Stalled = 1,
    /**
     * The query is finished.
     *
     * A query finishes either when it has collected `numResults` results from the
     * closes peers (not counting those that failed or are unresponsive)
     * or because the query ran out of peers that have not yet delivered results (or failed).
     */
    Finished = 2
}
export interface ILookupPeer {
    /**
     * The kbucket key used to identify the peer
     */
    nodeId: NodeId;
    /**
     * The current rpc request iteration that has been made on this peer
     */
    iteration: number;
    /**
     * The number of peers that have  been returned by this peer
     */
    peersReturned: number;
    /**
     * The current lookup state of this peer
     */
    state: LookupPeerState;
}
export declare enum LookupPeerState {
    /**
     * The peer has not yet been contacted
     *
     * This is the starting state for every peer known or discovered by a lookup
     */
    NotContacted = 0,
    /**
     * The lookup is waiting for a result from the peer
     */
    Waiting = 1,
    /**
     * The peer is waiting to begin another iteration
     */
    PendingIteration = 2,
    /**
     * Obtaining a result from the peer has failed
     */
    Failed = 3,
    /**
     * A successful result from the peer has been delivered
     */
    Succeeded = 4
}
