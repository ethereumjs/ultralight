/* eslint-env mocha */
/* eslint-disable max-len */
import {expect} from "chai";
import Service from "../../src/service/service";
import {ENR, v4} from "../../src/enr";
import {SessionService} from "../../src/session/service";
import {ISocketAddr, UDPTransportService} from "../../src/transport";
import {capture, instance, mock} from "ts-mockito";
import {IAuthMessagePacket, PacketType} from "../../src/packet";

describe("Service", () => {
  const sk = v4.createPrivateKey();
  const enr = ENR.createV4(v4.publicKey(sk));
  it("should start and stop", async () => {
    const service = Service.create(enr);
    await service.start();
    expect(service.started).to.true;
    await service.stop();
    expect(service.started).to.false;
  });

  it("should stop twice without problems", async () => {
    const service = Service.create(enr);
    await service.start();
    expect(service.started).to.true;
    await service.stop();
    expect(service.started).to.false;
    await service.stop();
    expect(service.started).to.false;
  });

  it("should bind to 0.0.0.0 by default", () => {
    const service = Service.create(enr);
    expect(service.networkInterface).eq("0.0.0.0");
  });

  it("should use port 30303 by default", () => {
    const service = Service.create(enr);
    expect(service.port).eq(30303);
  });

  it("should validate ports", () => {
    expect(() => { Service.create(enr, 0); }).to.throw("Invalid port number 0. It should be between 1 and 65535.");
    expect(() => { Service.create(enr, 100000); }).to.throw("Invalid port number 100000. It should be between 1 and 65535.");
  });

  it("should allow to pick a port and network interface", () => {
    const service = Service.create(enr, 300, "127.0.0.1");
    expect(service.port).eq(300);
    expect(service.networkInterface).eq("127.0.0.1");
  });

  it("should add new peers", async () => {
    const mockTransportService = mock(UDPTransportService);
    const serviceMock: UDPTransportService = instance(mockTransportService);
    const service = new Service(enr, 15000, "0.0.0.0", [], new SessionService(enr, serviceMock));
    const sk = v4.createPrivateKey();
    const peerENR = ENR.createV4(v4.publicKey(sk), {"ip": Buffer.from("127.0.0.1"), "udp": Buffer.from("10000")});
    await service.addPeer(peerENR);

    const [to, type, _] = capture(mockTransportService.send).last();
    expect(to.address).eq("127.0.0.1");
    expect(to.port).eq(10000);
    expect(type).eq(PacketType.AuthMessage);
  });
});