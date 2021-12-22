/* eslint-env mocha */
import { KademliaRoutingTable } from "../../../src/kademlia/kademlia";
import { expect } from "chai";
import { ENR, v4, createNodeId } from "../../../src/enr";
import { distance, EntryStatus, log2Distance } from "../../../src/kademlia";
import { randomBytes } from "libp2p-crypto";
import { toBuffer } from "../../../src/util";

describe("Kademlia routing table", () => {
  const nodeId = createNodeId(Buffer.alloc(32));

  it("should return true when empty initially", () => {
    const table = new KademliaRoutingTable(nodeId);
    expect(table.isEmpty()).to.be.true;
  });

  it("should return 0 when asked for size initially", () => {
    const table = new KademliaRoutingTable(nodeId);
    expect(table.size).eq(0);
  });

  it("should add items", () => {
    const table = new KademliaRoutingTable(nodeId);
    table.insertOrUpdate(randomENR(), EntryStatus.Disconnected);
    expect(table.isEmpty()).to.be.false;
    expect(table.size).eq(1);
  });
  /*
  it("should propose eviction if bucket is full", () => {
    const table = new KademliaRoutingTable(nodeId, 2,
      (rec: string) => Buffer.from(rec), () => 0);
    table.add("2");
    table.add("3");
    expect(table.isEmpty()).eq(false);
    expect(table.size).eq(2);
    table.add("5");
    expect(table.has("2")).to.be.true;
    expect(table.has("3")).to.be.true;
    expect(table.has("5")).to.be.false;
    expect(table.size).eq(2);
  });
  it("should allow to add a value after evicting", () => {
    const table = new KademliaRoutingTable<string>(Buffer.from("1"), 2,
      (rec: string) => Buffer.from(rec), () => 0);
    expect(table.propose("2")).to.be.undefined;
    expect(table.propose("3")).to.be.undefined;
    expect(table.isEmpty()).eq(false);
    expect(table.size).eq(2);
    const oldValue = table.propose("5");
    expect(oldValue).to.eql("2");
    expect(table.size).eq(2);
    expect(table.evict("22")).to.be.false;
    expect(table.evict(oldValue!)).to.be.true;
    expect(table.propose("5")).to.be.undefined;
    expect(table.size).eq(2);
  });
   */
  it("should clear values", () => {
    const table = new KademliaRoutingTable(nodeId);
    const enr = randomENR();
    table.insertOrUpdate(enr, EntryStatus.Disconnected);
    table.insertOrUpdate(randomENR(), EntryStatus.Disconnected);
    table.insertOrUpdate(randomENR(), EntryStatus.Disconnected);
    table.insertOrUpdate(randomENR(), EntryStatus.Disconnected);
    expect(table.size).to.eq(4);
    table.clear();
    expect(table.size).to.eq(0);
    expect(table.getValue(enr.nodeId)).to.be.undefined;
  });
  /*
  it("should provide nearest values", () => {
    const table = new KademliaRoutingTable<string>(Buffer.from("1"), 2,
      (rec: string) => Buffer.from(rec));
    table.add("2");
    table.add("3");
    table.add("g");
    table.add("f");
    expect(table.size).to.eq(4);
    expect(table.nearest("2", 2)).to.deep.eq(["2", "3"]);
    expect(table.nearest("g", 2)).to.deep.eq(["g", "f"]);
    expect(table.nearest("2", 4)).to.deep.eq(["2", "3", "f", "g"]);
  });
  it("should provide peers at a given distance", () => {
    const table = new KademliaRoutingTable<string>(Buffer.from("1"), 2,
      (rec: string) => Buffer.from(rec));
    table.add("2");
    table.add("3");
    table.add("g");
    table.add("f");
    expect(table.size).to.eq(4);
    expect(table.peersOfDistance(2)).to.deep.eq(["2", "3"]);
    expect(table.peersOfDistance(7)).to.deep.eq(["g", "f"]);
  });
  it("should provide peers at random", () => {
    const table = new KademliaRoutingTable<string>(Buffer.from("1"), 2,
      (rec: string) => Buffer.from(rec));
    table.add("2");
    table.add("3");
    table.add("g");
    table.add("f");
    expect(table.random()).to.be.oneOf(["2", "3", "g", "f"]);
  });
   */
  it("should return the closest nodes sorted", () => {
    const table = new KademliaRoutingTable(nodeId);

    for (let i = 0; i < 100; i++) {
      table.insertOrUpdate(randomENR(), EntryStatus.Disconnected);
    }

    for (let i = 0; i < 10; i++) {
      const target = randomNodeId();
      const enrs = table.nearest(target, 100);
      const expectedEnrs = enrs.slice().sort((a, b) => log2Distance(target, a.nodeId) - log2Distance(target, b.nodeId))
      expect(enrs).to.deep.equal(expectedEnrs);
    }
  })
});

function randomENR(): ENR {
  return ENR.createV4(v4.publicKey(v4.createPrivateKey()));
}

function randomNodeId(): string {
  return createNodeId(toBuffer(randomBytes(32)));
}