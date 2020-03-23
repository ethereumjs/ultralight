/* eslint-env mocha */
import { KademliaRoutingTable } from "../../src/kademlia/kademlia";
import { expect } from "chai";
import { ENR, v4, createNodeId } from "../../src/enr";

describe("Kademlia routing table",  () => {
  const nodeId = createNodeId(Buffer.alloc(32));
  it("should throw an error if the number of buckets is zero or negative", () => {
    expect(() => new KademliaRoutingTable(nodeId, 0)).throw("k must be positive");
    expect(() => new KademliaRoutingTable(nodeId, -1)).throw("k must be positive");
  });
  it("should return true when empty initially", () => {
    const table = new KademliaRoutingTable(nodeId, 1);
    expect(table.isEmpty()).to.be.true;
  });
  it("should return 0 when asked for size initially", () => {
    const table = new KademliaRoutingTable(nodeId, 1);
    expect(table.size).eq(0);
  });
  it("should add items", () => {
    const table = new KademliaRoutingTable(nodeId, 1);
    table.add(ENR.createV4(v4.publicKey(v4.createPrivateKey())));
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
    const table = new KademliaRoutingTable(nodeId, 4);
    const enr = ENR.createV4(v4.publicKey(v4.createPrivateKey()));
    table.add(enr);
    table.add(ENR.createV4(v4.publicKey(v4.createPrivateKey())));
    table.add(ENR.createV4(v4.publicKey(v4.createPrivateKey())));
    table.add(ENR.createV4(v4.publicKey(v4.createPrivateKey())));
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
});
