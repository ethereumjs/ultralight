/* eslint-env mocha */
import { expect } from "chai";
import Multiaddr = require("multiaddr");

import {PacketType, TAG_LENGTH, AUTH_TAG_LENGTH, MAGIC_LENGTH, IMessagePacket} from "../../src/packet";
import {UDPTransportService} from "../../src/transport";

describe("UDP transport", () => {
  const address = "127.0.0.1";
  const magicA = Buffer.alloc(MAGIC_LENGTH, 1);
  const portA = 49523;
  const multiaddrA = Multiaddr(`/ip4/${address}/udp/${portA}`);
  const a = new UDPTransportService(multiaddrA, magicA);

  const magicB = Buffer.alloc(MAGIC_LENGTH, 2);
  const portB = portA + 1;
  const multiaddrB = Multiaddr(`/ip4/${address}/udp/${portB}`);
  const b = new UDPTransportService(multiaddrB, magicB);

  before(async () => {
    await a.start();
    await b.start();
  });

  after(async () => {
    await a.stop();
    await b.stop();
  });

  it("should send and receive messages", async () => {
    const messagePacket: IMessagePacket = {
      type: PacketType.Message,
      tag: Buffer.alloc(TAG_LENGTH),
      authTag: Buffer.alloc(AUTH_TAG_LENGTH),
      message: Buffer.alloc(44, 1),
    };
    const received = new Promise((resolve) =>
      a.once("packet", (sender, packet) =>
        resolve([sender, packet])));
    await b.send(
      multiaddrA,
      messagePacket,
    );
    // @ts-ignore
    const [rSender, rPacket] = await received;
    expect(rSender.toString()).to.deep.equal(multiaddrB.toString());
    expect(rPacket).to.deep.equal(messagePacket);
  });
});
