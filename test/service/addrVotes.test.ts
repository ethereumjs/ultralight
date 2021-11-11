import { expect } from "chai";
import { Multiaddr } from "multiaddr";
import { createNodeId } from "../../src/enr";
import {AddrVotes} from "../../src/service/addrVotes";

describe("AddrVotes", () => {
  let addVotes: AddrVotes;

  beforeEach(() => {
    addVotes = new AddrVotes(3);
  });

  it("should return winning vote after 3 same votes", () => {
    const recipientIp = "127.0.0.1";
    const recipientPort = 30303;
    const multi0 = new Multiaddr(`/ip4/${recipientIp}/udp/${recipientPort}`);
    const nodeId = createNodeId(Buffer.alloc(32));
    const vote = {recipientIp, recipientPort};
    expect(addVotes.addVote(nodeId, vote)).to.be.undefined;
    // same vote, no effect
    for (let i = 0; i < 100; i++) {
      expect(addVotes.addVote(nodeId, vote)).to.be.undefined;
    }
    // 1 more vote, return undefined
    expect(addVotes.addVote(createNodeId(Buffer.alloc(32, 2)), vote)).to.be.undefined;
    // winning vote
    const winningVote = addVotes.addVote(createNodeId(Buffer.alloc(32, 3)), vote);
    expect(winningVote?.multiaddrStr).to.be.equal(multi0.toString(), "incorrect winning vote");
  });

  it("1 node adds 2 different vote", () => {
    const recipientIp = "127.0.0.1";
    const recipientPort = 30303;
    const multi0 = new Multiaddr(`/ip4/${recipientIp}/udp/${recipientPort}`);
    const nodeId = createNodeId(Buffer.alloc(32));
    const vote = {recipientIp, recipientPort};
    expect(addVotes.addVote(nodeId, vote)).to.be.undefined;
    // new vote, strange one => 1st vote is deleted
    expect(addVotes.addVote(nodeId, {...vote, recipientPort: 30304})).to.be.undefined;

    // need 3 more votes to win
    expect(addVotes.addVote(createNodeId(Buffer.alloc(32, 1)), vote)).to.be.undefined;
    expect(addVotes.addVote(createNodeId(Buffer.alloc(32, 2)), vote)).to.be.undefined;
    // winning vote
    const winningVote = addVotes.addVote(createNodeId(Buffer.alloc(32, 3)), vote);
    expect(winningVote?.multiaddrStr).to.be.equal(multi0.toString(), "incorrect winning vote");
  });
});
