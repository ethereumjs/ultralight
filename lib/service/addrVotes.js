"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddrVotes = void 0;
const multiaddr_1 = require("multiaddr");
const util_1 = require("../util");
const constants_1 = require("./constants");
class AddrVotes {
    constructor() {
        this.removeTally = (addrStr) => {
            this.tallies[addrStr] -= 1;
        };
        this.votes = new util_1.TimeoutMap(constants_1.IP_VOTE_TIMEOUT, this.removeTally);
        this.tallies = {};
    }
    addVote(voter, addr) {
        const addrStr = addr.toString();
        this.votes.set(voter, addrStr);
        this.addTally(addrStr);
    }
    removeVote(voter) {
        if (this.votes.delete(voter)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.removeTally(this.votes.get(voter));
        }
    }
    addTally(addrStr) {
        if (!this.tallies[addrStr]) {
            this.tallies[addrStr] = 0;
        }
        this.tallies[addrStr] += 1;
    }
    clear() {
        this.votes.clear();
        this.tallies = {};
    }
    best(tiebreaker) {
        if (!tiebreaker) {
            if (!this.votes.size) {
                return undefined;
            }
            tiebreaker = new multiaddr_1.Multiaddr(Object.keys(this.tallies)[0]);
        }
        const tiebreakerStr = tiebreaker.toString();
        let best = [tiebreakerStr, this.tallies[tiebreakerStr] ?? 0];
        for (const [addrStr, total] of Object.entries(this.tallies)) {
            if (total > best[1]) {
                best = [addrStr, total];
            }
        }
        return new multiaddr_1.Multiaddr(best[0]);
    }
}
exports.AddrVotes = AddrVotes;
