import { Multiaddr } from "multiaddr";

import { NodeId } from "../enr";
import { TimeoutMap } from "../util";
import { IP_VOTE_TIMEOUT } from "./constants";

export class AddrVotes {
  private votes: TimeoutMap<NodeId, string>;
  private tallies: Record<string, number>;

  constructor() {
    this.votes = new TimeoutMap(IP_VOTE_TIMEOUT, this.removeTally);
    this.tallies = {};
  }

  addVote(voter: NodeId, addr: Multiaddr): void {
    const addrStr = addr.toString();
    this.votes.set(voter, addrStr);
    this.addTally(addrStr);
  }

  removeVote(voter: NodeId): void {
    if (this.votes.delete(voter)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.removeTally(this.votes.get(voter)!);
    }
  }

  addTally(addrStr: string): void {
    if (!this.tallies[addrStr]) {
      this.tallies[addrStr] = 0;
    }
    this.tallies[addrStr] += 1;
  }

  removeTally = (addrStr: string): void => {
    this.tallies[addrStr] -= 1;
  };

  clear(): void {
    this.votes.clear();
    this.tallies = {};
  }

  best(tiebreaker?: Multiaddr): Multiaddr | undefined {
    if (!tiebreaker) {
      if (!this.votes.size) {
        return undefined;
      }
      tiebreaker = new Multiaddr(Object.keys(this.tallies)[0]);
    }
    const tiebreakerStr = tiebreaker.toString();
    let best: [string, number] = [tiebreakerStr, this.tallies[tiebreakerStr]];
    for (const [addrStr, total] of Object.entries(this.tallies)) {
      if (total > best[1]) {
        best = [addrStr, total];
      }
    }
    return new Multiaddr(best[0]);
  }
}
