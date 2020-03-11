import {KademliaRoutingTable, xorDist} from "../../src/kademlia/kademlia";
import { expect } from "chai";
import {ENR} from "../../src/enr";

describe("Kademlia xor function", () => {
  it("should throw an error if the 2 byte arrays are of different size", () => {
    expect(() => xorDist(Buffer.from("abc"), Buffer.from("abcd"))).throw("arrays are of different lengths");
  });

  it("should return zero if passed the same values", () => {
    expect(xorDist(Buffer.from("abc"), Buffer.from("abc"))).eq(0);
  });

  it("should return a distance of 1 if there is just one bit of difference", () => {
    expect(xorDist(Buffer.from([1]), Buffer.from([0]))).eq(1);
  });

  it("should return a distance of 16 as xor of vs 0xff", () => {
    const a = Buffer.from([0x0f, 0x0f, 0x0f, 0x0f]);
    const b = Buffer.from([0xf0, 0xf0, 0xf0, 0xf0]);
    expect(xorDist(a, b)).eq(32);
  });
});

describe("Kademlia routing table",  () => {
  it("should throw an error if the self ID is empty", () => {
    expect(() => new KademliaRoutingTable<ENR>(Buffer.of(), 2, 3,
      (enr: ENR) => Buffer.from(enr.id))).throw("selfId cannot be empty");
  });
  it("should throw an error if the number of buckets is zero", () => {
    expect(() => new KademliaRoutingTable<ENR>(Buffer.of(1,2,3), 0, 3,
      (enr: ENR) => Buffer.from(enr.id))).throw("k must be positive");
  });
  it("should throw an error if the number of buckets is negative", () => {
    expect(() => new KademliaRoutingTable<ENR>(Buffer.of(1,2,3), -1, 3,
      (enr: ENR) => Buffer.from(enr.id))).throw("k must be positive");
  });
  it("should throw an error if the number of replacements is negative", () => {
    expect(() => new KademliaRoutingTable<ENR>(Buffer.of(1,2,3), 1, -2,
      (enr: ENR) => Buffer.from(enr.id))).throw("maxReplacements must be positive or zero");
  });
});