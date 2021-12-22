import { EventEmitter } from "events";

import { ENR, NodeId } from "../enr";
import { createFindNodeMessage, RequestMessage } from "../message";
import { ILookupPeer, ILookupConfig, LookupState, LookupPeerState, LookupEventEmitter } from "./types";
import { distance, findNodeLog2Distances } from "./util";

export function createLookupPeer(nodeId: NodeId, state: LookupPeerState): ILookupPeer {
  return {
    nodeId,
    peersReturned: 0,
    state,
  };
}

export class Lookup extends (EventEmitter as { new (): LookupEventEmitter }) {
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
   * The number of peers for which the lookup is currently waiting on
   */
  numPeersWaiting: number;
  /**
   * The configuration of the lookup
   */
  config: ILookupConfig;

  timeout?: number;
  timeoutFn: Function;

  constructor(config: ILookupConfig, nodeId: NodeId, closestPeers: NodeId[]) {
    super();
    this.config = config;
    this.target = nodeId;
    this.untrustedEnrs = {};
    this.state = LookupState.Iterating;
    this.noProgress = 0;
    this.numPeersWaiting = 0;
    this.closestPeers = new Map(
      closestPeers
        .slice(0, this.config.lookupNumResults)
        .map((n) => [distance(nodeId, n), createLookupPeer(n, LookupPeerState.NotContacted)] as [bigint, ILookupPeer])
    );
    this.timeoutFn = () => this.stop();
  }

  start(): void {
    this.timeout = setTimeout(this.timeoutFn, this.config.lookupTimeout);
    for (let i = 0; i < this.closestPeers.size; i++) {
      this.nextPeer();
    }
  }

  stop(): void {
    if (this.state === LookupState.Finished) {
      return;
    }
    clearTimeout(this.timeout);
    this.state = LookupState.Finished;
    this.emit("finished", this.closestNodesByDistance());
  }

  /**
   * Checks if the lookup is at capacity w.r.t. the permitted parallelism.
   *
   * While the lookup is stalled, up to `numResults` parallel requests are allowed.
   * This is a slightly more permissive variant of the requirement that the initiator
   * resends the FINDNODE to all of the k closest nodes it has not already queried
   */
  atCapacity(): boolean {
    switch (this.state) {
      case LookupState.Stalled:
        return this.numPeersWaiting >= this.config.lookupNumResults;
      case LookupState.Iterating:
        return this.numPeersWaiting >= this.config.lookupParallelism;
      case LookupState.Finished:
        return true;
    }
  }

  /**
   * Closest peers returned in order of distance
   */
  closestPeersByDistance(): ILookupPeer[] {
    return Array.from(this.closestPeers.keys())
      .sort((a, b) => (b - a ? -1 : 1))
      .map((dist) => this.closestPeers.get(dist) as ILookupPeer);
  }

  /**
   * Closest nodes returned in order of distance, up to `config.numResults` returned
   */
  closestNodesByDistance(): NodeId[] {
    return this.closestPeersByDistance()
      .filter((peer) => peer.state === LookupPeerState.Succeeded)
      .map((peer) => peer.nodeId)
      .slice(0, this.config.lookupNumResults);
  }

  /**
   * Callback for delivering the result of a successful request to a peer that the lookup is waiting on.
   *
   * Delivering results of requests back to the lookup allows the lookup to make progress.
   * The lookup is said to make progress either when the given closerPeers contain a peer closer to the target
   * than any peer seen so far, or when the query did not yet accumulate numResults closest peers and
   * closerPeers contains a new peer, regardless of its distance to the target.
   */
  onSuccess(nodeId: NodeId, closerPeers: NodeId[]): void {
    if (this.state === LookupState.Finished) {
      return;
    }

    const dist = distance(nodeId, this.target);

    // Mark the peer's progress, the total nodes it has returned and its current iteration.
    // If iterations have been completed and the node returned peers, mark it as succeeded
    const peer = this.closestPeers.get(dist);
    if (peer) {
      if (peer.state === LookupPeerState.Waiting) {
        this.numPeersWaiting -= 1;
        peer.peersReturned += closerPeers.length;
        // mark the peer as succeeded
        peer.state = LookupPeerState.Succeeded;
      }
      const numClosest = this.closestPeers.size;
      let progress = false;

      let closestDist = this.closestPeers.size
        ? Array.from(this.closestPeers.keys()).reduce((acc, d) => (d < acc ? d : acc))
        : undefined;
      // incorporate the reported closer peers into the query
      for (const cNodeId of closerPeers) {
        const cDist = distance(this.target, cNodeId);
        if (!this.closestPeers.has(cDist)) {
          this.closestPeers.set(cDist, createLookupPeer(cNodeId, LookupPeerState.NotContacted));

          // Set the closest distance if cDist is closer
          if (closestDist === undefined || cDist < closestDist) {
            closestDist = cDist;
          }
        }
        // The lookup makes progress if the new peer is either closer to the target than any peer seen so far
        // or the lookup did not yet accumulate enough closest peers
        progress = progress || closestDist === cDist || numClosest < this.config.lookupNumResults;
      }

      // update the lookup state
      if (this.state === LookupState.Iterating) {
        // If there's progress, reset the noProgress counter
        this.noProgress = progress ? 0 : this.noProgress + 1;
        if (this.noProgress >= this.config.lookupParallelism) {
          this.state = LookupState.Stalled;
        }
      } else if (this.state === LookupState.Stalled) {
        if (progress) {
          this.state = LookupState.Iterating;
          this.noProgress = 0;
        }
      }
    }
    this.nextPeer();
  }

  /**
   * Callback for informing the lookup about a failed request to a peer
   * that the lookup is waiting on
   */
  onFailure(nodeId: NodeId): void {
    if (this.state === LookupState.Finished) {
      return;
    }
    const dist = distance(this.target, nodeId);
    const peer = this.closestPeers.get(dist);
    if (peer) {
      if (peer.state === LookupPeerState.Waiting) {
        this.numPeersWaiting -= 1;
        peer.state = LookupPeerState.Failed;
      }
    }
    this.nextPeer();
  }

  nextPeer(): void {
    if (this.state === LookupState.Finished) {
      return;
    }

    // Count the number of peers that returned a result.
    // If there is a request in progress to one of the `numResults` closest peers,
    // the counter is set to -1 (will never pass), as the query can only finish once `numResults` closest peers
    // have responded (or there are no more peers to contact)
    let resultCounter = 0;
    // Check if the query is at capacity w.r.t. the allowed parallelism
    const atCapacity = this.atCapacity();

    for (const peer of this.closestPeersByDistance()) {
      if (peer.state === LookupPeerState.NotContacted) {
        if (atCapacity) {
          return;
        } else {
          // This peer is waiting to be (re)iterated
          peer.state = LookupPeerState.Waiting;
          this.numPeersWaiting += 1;
          this.emit("peer", peer.nodeId);
          return;
        }
      }
      if (peer.state === LookupPeerState.Waiting) {
        if (atCapacity) {
          // The lookup is still waiting for a result from a peer and is
          // at capacity w.r.t. the maximum number of peers being waited on.
          return;
        } else {
          // The lookup is still waiting for a result from a peer and the
          // `resultCounter` did not yet reach `numResults`.
          // Therefore the lookup is not yet done, regardless of already successful
          // lookups to peers farther from the target.
          resultCounter = -1;
        }
      }
      if (peer.state === LookupPeerState.Succeeded) {
        if (resultCounter > 0) {
          resultCounter += 1;
          // If `numResults` successful results have been delivered for the closest peers,
          // the lookup is done
          if (resultCounter >= this.config.lookupNumResults) {
            this.state = LookupState.Finished;
            this.emit("finished", this.closestNodesByDistance());
            return;
          }
        }
      }
      // Skip over unresponsive or failed peers
    }
    // after iterating through peers
    if (this.numPeersWaiting === 0) {
      // The lookup is finished because all available peers have been contacted
      // and the lookup is not waiting for any more results
      this.state = LookupState.Finished;
      this.emit("finished", this.closestNodesByDistance());
    } // else
    // The lookup is still waiting for results and/or not at capacity w.r.t.
    // the allowed parallelism, but there are no new peers to contact
  }

  createRpcRequest(peer: NodeId): RequestMessage {
    const distances = findNodeLog2Distances(this.target, peer, this.config.lookupRequestLimit);
    return createFindNodeMessage(distances);
  }
}
