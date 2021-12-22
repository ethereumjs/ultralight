import { ENR, NodeId } from "../enr";
import { ILookupPeer, ILookupConfig, LookupState, LookupPeerState, LookupEventEmitter } from "./types";
export declare function createLookupPeer(nodeId: NodeId, state: LookupPeerState): ILookupPeer;
declare const Lookup_base: new () => LookupEventEmitter;
export declare class Lookup extends Lookup_base {
    /**
     * Target we're looking for
     */
    target: NodeId;
    /**
     * Temporary ENRs used when trying to reach nodes
     */
    untrustedEnrs: Record<NodeId, ENR>;
    /**
     * The current state of the lookup
     */
    state: LookupState;
    /**
     * The number of consecutive results that did not yield a peer closer to the target.
     *
     * Used when state is in LookupState.Iterating.
     * When this number reaches `parallelism` and no new peer was discovered or at least `numResults` peers
     * are known to the query, it signals a LookupState of `Stalled`.
     */
    noProgress: number;
    /**
     * The closest peers to the target
     */
    closestPeers: Map<bigint, ILookupPeer>;
    /**
     * Maximum RPC iterations per peer
     */
    maxIterationsPerPeer: number;
    /**
     * The number of peers for which the lookup is currently waiting on
     */
    numPeersWaiting: number;
    /**
     * The configuration of the lookup
     */
    config: ILookupConfig;
    timeout?: number;
    timeoutFn: Function;
    constructor(config: ILookupConfig, nodeId: NodeId, maxIterationsPerPeer: number, closestPeers: NodeId[]);
    start(): void;
    stop(): void;
    /**
     * Checks if the lookup is at capacity w.r.t. the permitted parallelism.
     *
     * While the lookup is stalled, up to `numResults` parallel requests are allowed.
     * This is a slightly more permissive variant of the requirement that the initiator
     * resends the FINDNODE to all of the k closest nodes it has not already queried
     */
    atCapacity(): boolean;
    /**
     * Closest peers returned in order of distance
     */
    closestPeersByDistance(): ILookupPeer[];
    /**
     * Closest nodes returned in order of distance, up to `config.numResults` returned
     */
    closestNodesByDistance(): NodeId[];
    /**
     * Callback for delivering the result of a successful request to a peer that the lookup is waiting on.
     *
     * Delivering results of requests back to the lookup allows the lookup to make progress.
     * The lookup is said to make progress either when the given closerPeers contain a peer closer to the target
     * than any peer seen so far, or when the query did not yet accumulate numResults closest peers and
     * closerPeers contains a new peer, regardless of its distance to the target.
     */
    onSuccess(nodeId: NodeId, closerPeers: NodeId[]): void;
    /**
     * Callback for informing the lookup about a failed request to a peer
     * that the lookup is waiting on
     */
    onFailure(nodeId: NodeId): void;
    nextPeer(): void;
}
export {};
