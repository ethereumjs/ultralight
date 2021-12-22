import { Multiaddr } from "multiaddr";
import { NodeId } from "../enr";
export declare class AddrVotes {
    private votes;
    private tallies;
    constructor();
    addVote(voter: NodeId, addr: Multiaddr): void;
    removeVote(voter: NodeId): void;
    addTally(addrStr: string): void;
    removeTally: (addrStr: string) => void;
    clear(): void;
    best(tiebreaker?: Multiaddr): Multiaddr | undefined;
}
