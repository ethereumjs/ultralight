"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupPeerState = exports.LookupState = exports.EntryStatus = void 0;
var EntryStatus;
(function (EntryStatus) {
    EntryStatus[EntryStatus["Connected"] = 0] = "Connected";
    EntryStatus[EntryStatus["Disconnected"] = 1] = "Disconnected";
})(EntryStatus = exports.EntryStatus || (exports.EntryStatus = {}));
var LookupState;
(function (LookupState) {
    /**
     * The query is making progress by iterating towards `numResults` closest peers
     * to the target with a maximum of `parallelism` peers at a time
     */
    LookupState[LookupState["Iterating"] = 0] = "Iterating";
    /**
     * A query is stalled when it did not make progress after `parallelism` consecutive
     * successful results.
     *
     * While the query is stalled, the maximum allowed parallelism for pending results
     * is increased to numResults in an attempt to finish the query.
     * If the query can make progress again upon receiving the remaining results,
     * it switches back to `Iterating`. Otherwise it will be finished.
     */
    LookupState[LookupState["Stalled"] = 1] = "Stalled";
    /**
     * The query is finished.
     *
     * A query finishes either when it has collected `numResults` results from the
     * closes peers (not counting those that failed or are unresponsive)
     * or because the query ran out of peers that have not yet delivered results (or failed).
     */
    LookupState[LookupState["Finished"] = 2] = "Finished";
})(LookupState = exports.LookupState || (exports.LookupState = {}));
var LookupPeerState;
(function (LookupPeerState) {
    /**
     * The peer has not yet been contacted
     *
     * This is the starting state for every peer known or discovered by a lookup
     */
    LookupPeerState[LookupPeerState["NotContacted"] = 0] = "NotContacted";
    /**
     * The lookup is waiting for a result from the peer
     */
    LookupPeerState[LookupPeerState["Waiting"] = 1] = "Waiting";
    /**
     * The peer is waiting to begin another iteration
     */
    LookupPeerState[LookupPeerState["PendingIteration"] = 2] = "PendingIteration";
    /**
     * Obtaining a result from the peer has failed
     */
    LookupPeerState[LookupPeerState["Failed"] = 3] = "Failed";
    /**
     * A successful result from the peer has been delivered
     */
    LookupPeerState[LookupPeerState["Succeeded"] = 4] = "Succeeded";
})(LookupPeerState = exports.LookupPeerState || (exports.LookupPeerState = {}));
