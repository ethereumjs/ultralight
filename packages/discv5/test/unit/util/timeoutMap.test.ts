/* eslint-env mocha */
import { expect } from "chai";

import { TimeoutMap } from "../../../src/util";

describe("TimeoutMap", () => {
  it("should evict items after a timeout", async function () {
    const timeout = 15;
    const map = new TimeoutMap(timeout);
    map.set("foo", "bar");
    await new Promise((resolve) => setTimeout(resolve, timeout + 1));
    expect(map.size).to.equal(0);
  });
  it("should call onTimeout after a timeout", async function () {
    const timeout = 15;
    let callbackCalled = false;
    const map = new TimeoutMap(timeout, (k, v) => {
      expect(k).to.equal("foo");
      expect(v).to.equal("bar");
      callbackCalled = true;
    });
    map.set("foo", "bar");
    await new Promise((resolve) => setTimeout(resolve, timeout + 1));
    expect(map.size).to.equal(0);
    expect(callbackCalled).to.equal(true);
  });
  it("should update a timeout", async function () {
    const timeout = 15;
    const map = new TimeoutMap(timeout);
    map.set("foo", "bar");
    map.setTimeout("foo", timeout * 2);
    await new Promise((resolve) => setTimeout(resolve, timeout));
    expect(map.size).to.equal(1);
    await new Promise((resolve) => setTimeout(resolve, timeout + 1));
    expect(map.size).to.equal(0);
  });
});
