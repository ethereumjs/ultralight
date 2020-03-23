/* eslint-env mocha */
import Multiaddr = require("multiaddr");

import { createKeypair, KeypairType } from "../../src/keypair";
import { ENR } from "../../src/enr";
import { createMagic } from "../../src/packet";
import { UDPTransportService } from "../../src/transport";
import { SessionService } from "../../src/session";

describe("session service", () => {
  const kp0 = createKeypair(
    KeypairType.secp256k1,
    Buffer.from("a93bedf04784c937059557c9dcb328f5f59fdb6e89295c30e918579250b7b01f", "hex"),
    Buffer.from("022663242e1092ea19e6bb41d67aa69850541a623b94bbea840ddceaab39789894", "hex"),
  );
  const kp1 = createKeypair(
    KeypairType.secp256k1,
    Buffer.from("bd04e55f2a1424a4e69e96aad41cf763d2468d4358472e9f851569bdf47fb24c", "hex"),
    Buffer.from("03eae9945b354e9212566bc3f2740f3a62b3e1eb227dbed809f6dc2d3ea848c82e", "hex"),
  );

  const addr0 = Multiaddr("/ip4/127.0.0.1/udp/49020");
  const addr1 = Multiaddr("/ip4/127.0.0.1/udp/49021");

  const enr0 = ENR.createV4(kp0.publicKey);
  const enr1 = ENR.createV4(kp1.publicKey);

  enr0.multiaddrUDP = addr0;
  enr1.multiaddrUDP = addr1;

  const magic0 = createMagic(enr0.nodeId);
  const magic1 = createMagic(enr1.nodeId);

  it("start/stop service", async () => {
    const transport0 = new UDPTransportService(addr0, magic0);
    const transport1 = new UDPTransportService(addr1, magic1);

    const service0 = new SessionService(enr0, kp0, transport0);
    const service1 = new SessionService(enr1, kp1, transport1);

    await service0.start();
    await service1.start();

    await service0.stop();
    await service1.stop();
  });
});
