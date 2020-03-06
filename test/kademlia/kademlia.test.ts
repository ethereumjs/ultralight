import {xorDist} from "../../src/kademlia/kademlia";
import { expect } from "chai";

describe("Kademlia xor function", () => {
  it("should throw an error if the 2 byte arrays are of different size", () => {
    expect(() => xorDist(Buffer.from("abc"), Buffer.from("abcd"))).throw("arrays are of different lengths")
  });

  it("should return zero if passed the same values", () => {
    expect(xorDist(Buffer.from("abc"), Buffer.from("abc"))).eq(0)
  });

  it("should return a distance of 1 if there is just one bit of difference", () => {
    expect(xorDist(Buffer.from([1]), Buffer.from([0]))).eq(1)
  });

  it("should return a distance of 16 as xor of vs 0xff", () => {
    const a = Buffer.from([0x0f, 0x0f, 0x0f, 0x0f]);
    const b = Buffer.from([0xf0, 0xf0, 0xf0, 0xf0]);
    expect(xorDist(a, b)).eq(32);
  });
});