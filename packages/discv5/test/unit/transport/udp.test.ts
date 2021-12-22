/* eslint-env mocha */
import { expect } from "chai";
import { Multiaddr } from "multiaddr";

import { PacketType, IPacket, NONCE_SIZE, MASKING_IV_SIZE } from "../../../src/packet";
import { UDPTransportService } from "../../../src/transport";
import { toHex } from "../../../src/util";

describe("UDP transport", () => {
  const address = "127.0.0.1";
  const nodeIdA = toHex(Buffer.alloc(32, 1));
  const portA = 49523;
  const multiaddrA = new Multiaddr(`/ip4/${address}/udp/${portA}`);
  const a = new UDPTransportService(multiaddrA, nodeIdA);

  const nodeIdB = toHex(Buffer.alloc(32, 2));
  const portB = portA + 1;
  const multiaddrB = new Multiaddr(`/ip4/${address}/udp/${portB}`);
  const b = new UDPTransportService(multiaddrB, nodeIdB);

  before(async () => {
    await a.start();
    await b.start();
  });

  after(async () => {
    await a.stop();
    await b.stop();
  });

  it("should send and receive messages", async () => {
    const messagePacket: IPacket = {
      maskingIv: Buffer.alloc(MASKING_IV_SIZE),
      header: {
        protocolId: "discv5",
        version: 1,
        flag: PacketType.Message,
        nonce: Buffer.alloc(NONCE_SIZE),
        authdataSize: 32,
        authdata: Buffer.alloc(32, 2)
      },
      message: Buffer.alloc(44, 1),
    };
    const received = new Promise((resolve) => a.once("packet", (sender, packet) => resolve([sender, packet])));
    await b.send(multiaddrA, nodeIdA, messagePacket);
    // @ts-ignore
    const [rSender, rPacket] = await received;
    expect(rSender.toString()).to.deep.equal(multiaddrB.toString());
    expect(rPacket.maskingIv).to.deep.equal(messagePacket.maskingIv);
    expect(rPacket.header).to.deep.equal(messagePacket.header);
    expect(rPacket.message).to.deep.equal(messagePacket.message);
  });
});
