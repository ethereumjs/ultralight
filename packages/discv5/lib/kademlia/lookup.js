"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lookup = exports.createLookupPeer = void 0;
const events_1 = require("events");
const types_1 = require("./types");
const util_1 = require("./util");
function createLookupPeer(nodeId, state) {
    return {
        nodeId,
        iteration: 1,
        peersReturned: 0,
        state,
    };
}
exports.createLookupPeer = createLookupPeer;
class Lookup extends events_1.EventEmitter {
    constructor(config, nodeId, maxIterationsPerPeer, closestPeers) {
        super();
        this.config = config;
        this.target = nodeId;
        this.untrustedEnrs = {};
        this.state = types_1.LookupState.Iterating;
        this.noProgress = 0;
        this.maxIterationsPerPeer = maxIterationsPerPeer;
        this.numPeersWaiting = 0;
        this.closestPeers = new Map(closestPeers
            .slice(0, this.config.lookupNumResults)
            .map((n) => [util_1.distance(nodeId, n), createLookupPeer(n, types_1.LookupPeerState.NotContacted)]));
        this.timeoutFn = () => this.stop();
    }
    start() {
        this.timeout = setTimeout(this.timeoutFn, this.config.lookupTimeout);
        for (let i = 0; i < this.closestPeers.size; i++) {
            this.nextPeer();
        }
    }
    stop() {
        if (this.state === types_1.LookupState.Finished) {
            return;
        }
        clearTimeout(this.timeout);
        this.state = types_1.LookupState.Finished;
        this.emit("finished", this.closestNodesByDistance());
    }
    /**
     * Checks if the lookup is at capacity w.r.t. the permitted parallelism.
     *
     * While the lookup is stalled, up to `numResults` parallel requests are allowed.
     * This is a slightly more permissive variant of the requirement that the initiator
     * resends the FINDNODE to all of the k closest nodes it has not already queried
     */
    atCapacity() {
        switch (this.state) {
            case types_1.LookupState.Stalled:
                return this.numPeersWaiting >= this.config.lookupNumResults;
            case types_1.LookupState.Iterating:
                return this.numPeersWaiting >= this.config.lookupParallelism;
            case types_1.LookupState.Finished:
                return true;
        }
    }
    /**
     * Closest peers returned in order of distance
     */
    closestPeersByDistance() {
        return Array.from(this.closestPeers.keys())
            .sort((a, b) => (b - a ? -1 : 1))
            .map((dist) => this.closestPeers.get(dist));
    }
    /**
     * Closest nodes returned in order of distance, up to `config.numResults` returned
     */
    closestNodesByDistance() {
        return this.closestPeersByDistance()
            .filter((peer) => peer.state === types_1.LookupPeerState.Succeeded)
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
    onSuccess(nodeId, closerPeers) {
        if (this.state === types_1.LookupState.Finished) {
            return;
        }
        const dist = util_1.distance(nodeId, this.target);
        // Mark the peer's progress, the total nodes it has returned and its current iteration.
        // If iterations have been completed and the node returned peers, mark it as succeeded
        const peer = this.closestPeers.get(dist);
        if (peer) {
            if (peer.state === types_1.LookupPeerState.Waiting) {
                this.numPeersWaiting -= 1;
                peer.peersReturned += closerPeers.length;
                if (peer.peersReturned >= this.config.lookupNumResults) {
                    peer.state = types_1.LookupPeerState.Succeeded;
                }
                else if (this.maxIterationsPerPeer <= peer.iteration) {
                    if (peer.peersReturned > 0) {
                        peer.state = types_1.LookupPeerState.Succeeded;
                    }
                    else {
                        peer.state = types_1.LookupPeerState.Failed;
                    }
                }
                else {
                    // still have iterations to complete
                    peer.iteration += 1;
                    peer.state = types_1.LookupPeerState.PendingIteration;
                }
            }
            const numClosest = this.closestPeers.size;
            let progress = false;
            // incorporate the reported closer peers into the query
            closerPeers.forEach((cNodeId) => {
                const cDist = util_1.distance(this.target, cNodeId);
                if (!this.closestPeers.has(cDist)) {
                    this.closestPeers.set(cDist, createLookupPeer(cNodeId, types_1.LookupPeerState.NotContacted));
                }
                // The lookup makes progress if the new peer is either closer to the target than any peer seen so far
                // or the lookup did not yet accumulate enough closest peers
                const closest = Array.from(this.closestPeers.keys()).sort((a, b) => (b > a ? -1 : 1))[0];
                progress = progress || closest === cDist || numClosest < this.config.lookupNumResults;
            });
            // update the lookup state
            if (this.state === types_1.LookupState.Iterating) {
                // If there's progress, reset the noProgress counter
                this.noProgress = progress ? 0 : this.noProgress + 1;
                if (this.noProgress >= this.config.lookupParallelism * this.maxIterationsPerPeer) {
                    this.state = types_1.LookupState.Stalled;
                }
            }
            else if (this.state === types_1.LookupState.Stalled) {
                if (progress) {
                    this.state = types_1.LookupState.Iterating;
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
    onFailure(nodeId) {
        if (this.state === types_1.LookupState.Finished) {
            return;
        }
        const dist = util_1.distance(this.target, nodeId);
        const peer = this.closestPeers.get(dist);
        if (peer) {
            if (peer.state === types_1.LookupPeerState.Waiting) {
                this.numPeersWaiting -= 1;
                peer.state = types_1.LookupPeerState.Failed;
            }
        }
        this.nextPeer();
    }
    nextPeer() {
        if (this.state === types_1.LookupState.Finished) {
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
            if (peer.state === types_1.LookupPeerState.NotContacted || peer.state === types_1.LookupPeerState.PendingIteration) {
                if (atCapacity) {
                    return;
                }
                else {
                    // This peer is waiting to be (re)iterated
                    peer.state = types_1.LookupPeerState.Waiting;
                    this.numPeersWaiting += 1;
                    this.emit("peer", peer);
                    return;
                }
            }
            if (peer.state === types_1.LookupPeerState.Waiting) {
                if (atCapacity) {
                    // The lookup is still waiting for a result from a peer and is
                    // at capacity w.r.t. the maximum number of peers being waited on.
                    return;
                }
                else {
                    // The lookup is still waiting for a result from a peer and the
                    // `resultCounter` did not yet reach `numResults`.
                    // Therefore the lookup is not yet done, regardless of already successful
                    // lookups to peers farther from the target.
                    resultCounter = -1;
                }
            }
            if (peer.state === types_1.LookupPeerState.Succeeded) {
                if (resultCounter > 0) {
                    resultCounter += 1;
                    // If `numResults` successful results have been delivered for the closest peers,
                    // the lookup is done
                    if (resultCounter >= this.config.lookupNumResults) {
                        this.state = types_1.LookupState.Finished;
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
            this.state = types_1.LookupState.Finished;
            this.emit("finished", this.closestNodesByDistance());
        } // else
        // The lookup is still waiting for results and/or not at capacity w.r.t.
        // the allowed parallelism, but there are no new peers to contact
    }
}
exports.Lookup = Lookup;
