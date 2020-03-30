/* eslint-env mocha */
/* eslint-disable max-len */
import { expect } from "chai";
import Multiaddr = require("multiaddr");

import { Discv5 } from "../../src/service/service";
import { ENR, v4 } from "../../src/enr";
import { SessionService } from "../../src/session/service";
import { ISocketAddr, UDPTransportService } from "../../src/transport";
import { IAuthMessagePacket, PacketType } from "../../src/packet";
import { generateKeypair, KeypairType } from "../../src/keypair";

describe("Discv5", () => {
  const kp0 = generateKeypair(KeypairType.secp256k1);
  const enr0 = ENR.createV4(kp0.publicKey);
  const mu0 = Multiaddr("/ip4/127.0.0.1/udp/40000");
  const addr0 = mu0.toOptions();

  const service0 = Discv5.create(enr0, kp0, mu0);

  beforeEach(async () => {
    await service0.start();
  });

  afterEach(async () => {
    await service0.stop();
  });

  it("should start and stop", async () => {
  });

  it("should allow to pick a port and network interface as a multiaddr", async () => {
    expect(service0.transportMultiaddr.toString()).eq(mu0.toString());
  });

  it("should add new enrs", async () => {
    const kp1 = generateKeypair(KeypairType.secp256k1);
    const enr1 = ENR.createV4(kp1.publicKey);
    service0.addEnr(enr1);
    expect(service0.kadValues().length).eq(1);
  });

  it("should complete a lookup to another node", async () => {
    const kp1 = generateKeypair(KeypairType.secp256k1);
    const enr1 = ENR.createV4(kp1.publicKey);
    const mu1 = Multiaddr("/ip4/127.0.0.1/udp/10360");
    const addr1 = mu1.tuples();
    enr1.set("ip", addr1[0][1]);
    enr1.set("udp", addr1[1][1]);
    enr1.encode(kp1.privateKey);
    const service1 = Discv5.create(enr1, kp1, mu1);
    await service1.start();
    for (let i =0; i < 100; i++) {
      const kp = generateKeypair(KeypairType.secp256k1);
      const enr = ENR.createV4(kp.publicKey);
      enr.encode(kp.privateKey);
      service1.addEnr(enr);
    }
    service0.addEnr(enr1);
    await service0.findNode(Buffer.alloc(32).toString("hex"));
    await service1.stop();
  });
});
