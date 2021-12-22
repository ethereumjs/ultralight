/* eslint-env mocha */
/* eslint-disable max-len */
import { expect } from "chai";
import { Multiaddr } from "multiaddr";

import { Discv5 } from "../../../src/service/service";
import { ENR } from "../../../src/enr";
import { generateKeypair, KeypairType, createPeerIdFromKeypair } from "../../../src/keypair";

describe("Discv5", async () => {
  const kp0 = generateKeypair(KeypairType.secp256k1);
  const peerId0 = await createPeerIdFromKeypair(kp0);
  const enr0 = ENR.createV4(kp0.publicKey);
  const mu0 = new Multiaddr("/ip4/127.0.0.1/udp/40000");
  const addr0 = mu0.toOptions();

  const service0 = Discv5.create({enr: enr0, peerId: peerId0, multiaddr: mu0});

  beforeEach(async () => {
    await service0.start();
  });

  afterEach(async () => {
    await service0.stop();
  });

  it("should start and stop", async () => {});

  it("should allow to pick a port and network interface as a multiaddr", async () => {
    expect(service0.bindAddress.toString()).eq(mu0.toString());
  });

  it("should add new enrs", async () => {
    const kp1 = generateKeypair(KeypairType.secp256k1);
    const enr1 = ENR.createV4(kp1.publicKey);
    enr1.encode(kp1.privateKey);
    service0.addEnr(enr1);
    expect(service0.kadValues().length).eq(1);
  });

  it("should complete a lookup to another node", async function () {
    this.timeout(10000);
    const kp1 = generateKeypair(KeypairType.secp256k1);
    const peerId1 = await createPeerIdFromKeypair(kp1);
    const enr1 = ENR.createV4(kp1.publicKey);
    const mu1 = new Multiaddr("/ip4/127.0.0.1/udp/10360");
    const addr1 = mu1.tuples();

    if (!addr1[0][1] || !addr1[1][1]) {
      throw new Error('invalid multiaddr')
    }

    enr1.set("ip", addr1[0][1]);
    enr1.set("udp", addr1[1][1]);
    enr1.encode(kp1.privateKey);
    const service1 = Discv5.create({enr: enr1, peerId: peerId1, multiaddr: mu1});
    await service1.start();
    for (let i = 0; i < 100; i++) {
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
