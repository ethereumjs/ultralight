/* eslint-env mocha */
/* eslint-disable max-len */
import {expect} from "chai";
import Service from "../../src/service/service";
import {ENR, v4} from "../../src/enr";

describe("Service", () => {
  const sk = v4.createPrivateKey();
  const enr = ENR.createV4(v4.publicKey(sk));
  it("should start and stop", async () => {
    const service = new Service(enr);
    await service.start();
    expect(service.started).to.true;
    await service.stop();
    expect(service.started).to.false;
  });

  it("should stop twice without problems", async () => {
    const service = new Service(enr);
    await service.start();
    expect(service.started).to.true;
    await service.stop();
    expect(service.started).to.false;
    await service.stop();
    expect(service.started).to.false;
  });

  it("should bind to 0.0.0.0 by default", () => {
    const service = new Service(enr);
    expect(service.networkInterface).eq("0.0.0.0");
  });

  it("should use port 30303 by default", () => {
    const service = new Service(enr);
    expect(service.port).eq(30303);
  });

  it("should validate ports", () => {
    expect(() => { new Service(enr, 0); }).to.throw("Invalid port number 0. It should be between 1 and 65535.");
    expect(() => { new Service(enr, 100000); }).to.throw("Invalid port number 0. It should be between 1 and 65535.");
  });

  it("should allow to pick a port and network interface", () => {
    const service = new Service(enr, 300, "127.0.0.1");
    expect(service.port).eq(300);
    expect(service.networkInterface).eq("127.0.0.1");
  });
});