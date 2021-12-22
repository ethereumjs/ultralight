/* eslint-env mocha */
import { expect } from "chai";
import { randomBytes } from "bcrypto/lib/random";
import { distance, log2Distance } from "../../../src/kademlia";
import { createNodeId } from "../../../src/enr";

describe("Kademlia distance function", () => {
  it("identity", () => {
    const a = createNodeId(Buffer.alloc(32));
    expect(distance(a, a)).eq(0n);
  });

  it("symmetry", () => {
    const a = createNodeId(Buffer.alloc(32));
    const b = createNodeId(Buffer.alloc(32, 1));
    expect(distance(a, b)).eq(distance(b, a));
  });

  it("triangle inequality", () => {
    const a = createNodeId(randomBytes(32));
    const b = createNodeId(randomBytes(32));
    const c = createNodeId(randomBytes(32));
    expect(distance(a, b) <= distance(a, c) + distance(c, b)).to.be.true;
  });
});

describe("Kademlia log2Distance function", () => {
  it("should return a distance of 0 if no bits are different", () => {
    const a = createNodeId(Buffer.alloc(32));
    expect(log2Distance(a, a)).eq(0);
  });

  it("should return a distance of 1 if the last bit is different", () => {
    const a = createNodeId(Buffer.alloc(32));
    const b = Buffer.alloc(32);
    b[31] = 1;
    expect(log2Distance(a, createNodeId(b))).eq(1);
  });

  it("should return a distance of 256 if the first bit is different", () => {
    const a = createNodeId(Buffer.alloc(32));
    const b = Buffer.alloc(32);
    b[0] = 128;
    expect(log2Distance(a, createNodeId(b))).eq(256);
  });
});
