/* eslint-env mocha */
import { expect } from "chai";
import { Multiaddr } from "multiaddr";

import { createKeypair, KeypairType } from "../../../src/keypair";
import { ENR } from "../../../src/enr";
import { createWhoAreYouPacket, IPacket, PacketType } from "../../../src/packet";
import { UDPTransportService } from "../../../src/transport";
import { SessionService } from "../../../src/session";
import { createFindNodeMessage } from "../../../src/message";
import { defaultConfig } from "../../../src/config";
import { createNodeContact } from "../../../src/session/nodeInfo";

describe("session service", () => {
  const kp0 = createKeypair(
    KeypairType.secp256k1,
    Buffer.from("a93bedf04784c937059557c9dcb328f5f59fdb6e89295c30e918579250b7b01f", "hex"),
    Buffer.from("022663242e1092ea19e6bb41d67aa69850541a623b94bbea840ddceaab39789894", "hex")
  );
  const kp1 = createKeypair(
    KeypairType.secp256k1,
    Buffer.from("bd04e55f2a1424a4e69e96aad41cf763d2468d4358472e9f851569bdf47fb24c", "hex"),
    Buffer.from("03eae9945b354e9212566bc3f2740f3a62b3e1eb227dbed809f6dc2d3ea848c82e", "hex")
  );

  const addr0 = new Multiaddr("/ip4/127.0.0.1/udp/49020");
  const addr1 = new Multiaddr("/ip4/127.0.0.1/udp/49021");

  const enr0 = ENR.createV4(kp0.publicKey);
  const enr1 = ENR.createV4(kp1.publicKey);

  enr0.setLocationMultiaddr(addr0);
  enr1.setLocationMultiaddr(addr1);

  let transport0: UDPTransportService;
  let transport1: UDPTransportService;

  let service0: SessionService;
  let service1: SessionService;

  beforeEach(async () => {
    transport0 = new UDPTransportService(addr0, enr0.nodeId);
    transport1 = new UDPTransportService(addr1, enr1.nodeId);

    service0 = new SessionService(defaultConfig, enr0, kp0, transport0);
    service1 = new SessionService(defaultConfig, enr1, kp1, transport1);

    await service0.start();
    await service1.start();
  });

  afterEach(async () => {
    await service0.stop();
    await service1.stop();
  });

  it("should negotiate a session and receive a message from a cold sender (a->RandomPacket -> b->WhoAreYou -> a->Handshake)", async () => {
    const receivedRandom = new Promise<void>((resolve) =>
      transport1.once("packet", (sender: Multiaddr, data: IPacket) => {
        expect(sender.toString()).to.equal(addr0.toString());
        expect(data.header.flag).to.equal(PacketType.Message);
        resolve();
      })
    );
    const receivedWhoAreYou = new Promise<void>((resolve) =>
      transport0.once("packet", (sender: Multiaddr, data: IPacket) => {
        expect(sender.toString()).to.equal(addr1.toString());
        expect(data.header.flag).to.equal(PacketType.WhoAreYou);
        resolve();
      })
    );
    // send a who are you when requested
    service1.on("whoAreYouRequest", (nodeAddr, authTag) => {
      service1.sendChallenge(nodeAddr, authTag, enr0);
    });
    const establishedSession = new Promise<void>((resolve) =>
      service1.once("established", (enr) => {
        expect(enr).to.deep.equal(enr0);
        resolve();
      })
    );
    const receivedMsg = new Promise<void>((resolve) =>
      service1.once("request", (nodeAddr, request) => {
        resolve();
      })
    );
    service0.sendRequest(createNodeContact(enr1), createFindNodeMessage([0]));
    await Promise.all([receivedRandom, receivedWhoAreYou, establishedSession, receivedMsg]);
  });
  it("receiver should drop WhoAreYou packets from destinations without existing pending requests", async () => {
    transport0.send(addr1, enr1.nodeId, createWhoAreYouPacket(Buffer.alloc(12), BigInt(0)));
    transport0.on("packet", () => expect.fail("transport0 should not receive any packets"));
  });
  it("should only accept WhoAreYou packets from destinations with existing pending requests", async () => {});
});
