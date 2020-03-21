/* eslint-env mocha */
import {PacketType, TAG_LENGTH, AUTH_TAG_LENGTH, MAGIC_LENGTH, IMessagePacket} from "../../src/packet";
import {UDPTransportService} from "../../src/transport";
import { expect } from "chai";

describe("UDP transport", () => {
  const address = "127.0.0.1";
  const magicA = Buffer.alloc(MAGIC_LENGTH, 1);
  const portA = 49523;
  const a = new UDPTransportService({port: portA, address}, magicA);

  const magicB = Buffer.alloc(MAGIC_LENGTH, 2);
  const portB = portA + 1;
  const b = new UDPTransportService({port: portB, address}, magicB);

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
      {port: portA, address},
      messagePacket,
    );
    // @ts-ignore
    const [rSender, rPacket] = await received;
    expect(rSender).to.deep.equal({port: portB, address});
    expect(rPacket).to.deep.equal(messagePacket);
  });
});
