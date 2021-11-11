import isIp from "is-ip";
import { NodeId } from "../enr";

type MultiaddrStr = string;

const MAX_VOTES = 200;

export class AddrVotes {
  /** Bounded by `MAX_VOTES`, on new votes evicts the oldest votes */
  private readonly votes = new Map<NodeId, { multiaddrStr: MultiaddrStr; unixTsMs: number }>();
  /** Bounded by votes, if the vote count of some `MultiaddrStr` reaches 0, its key is deleted */
  private readonly tallies = new Map<MultiaddrStr, number>();

  constructor(private readonly addrVotesToUpdateEnr: number) {}

  /**
   * Adds vote to a given `recipientIp` and `recipientPort`. If the votes for this addr are greater than `votesToWin`,
   * this function returns the winning `multiaddrStr` and clears existing votes, restarting the process.
   */
  addVote(
    voter: NodeId,
    { recipientIp, recipientPort }: { recipientIp: string; recipientPort: number }
  ): { multiaddrStr: string } | undefined {
    const multiaddrStr = `/${isIp.v4(recipientIp) ? "ip4" : "ip6"}/${recipientIp}/udp/${recipientPort}`;

    const prevVote = this.votes.get(voter);
    if (prevVote?.multiaddrStr === multiaddrStr) {
      // Same vote, ignore
      return;
    } else if (prevVote !== undefined) {
      // If there was a previous vote, remove from tally
      const prevVoteTally = (this.tallies.get(prevVote.multiaddrStr) ?? 0) - 1;
      if (prevVoteTally <= 0) {
        this.tallies.delete(prevVote.multiaddrStr);
      } else {
        this.tallies.set(prevVote.multiaddrStr, prevVoteTally);
      }
    }

    const currentTally = (this.tallies.get(multiaddrStr) ?? 0) + 1;

    // Conclude vote period if there are enough votes for an option
    if (currentTally >= this.addrVotesToUpdateEnr) {
      // If enough peers vote on the same multiaddrStr conclude the vote
      this.clear();
      return { multiaddrStr };
    }

    // Persist vote
    this.tallies.set(multiaddrStr, currentTally);
    this.votes.set(voter, { multiaddrStr, unixTsMs: Date.now() });

    // If there are too many votes, remove the oldest
    if (this.votes.size > MAX_VOTES) {
      for (const vote of this.votes.keys()) {
        this.votes.delete(vote);
        if (this.votes.size <= MAX_VOTES) {
          break;
        }
      }
    }
  }

  clear(): void {
    this.votes.clear();
    this.tallies.clear();
  }
}
