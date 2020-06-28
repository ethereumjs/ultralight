import * as dgram from "dgram";
import { EventEmitter } from "events";
import Multiaddr = require("multiaddr");

import { decode, encode, Packet, MAX_PACKET_SIZE } from "../packet";
import { IRemoteInfo, ITransportService, TransportEventEmitter } from "./types";

/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over UDP
 */
export class UDPTransportService extends (EventEmitter as { new (): TransportEventEmitter })
  implements ITransportService {
  public multiaddr: Multiaddr;
  private socket!: dgram.Socket;
  private whoAreYouMagic: Buffer;

  public constructor(multiaddr: Multiaddr, whoAreYouMagic: Buffer) {
    super();
    const opts = multiaddr.toOptions();
    if (opts.transport !== "udp") {
      throw new Error("Local multiaddr must use UDP");
    }
    this.multiaddr = multiaddr;
    this.whoAreYouMagic = whoAreYouMagic;
  }

  public async start(): Promise<void> {
    const opts = this.multiaddr.toOptions();
    this.socket = dgram.createSocket({
      recvBufferSize: 16 * MAX_PACKET_SIZE,
      sendBufferSize: MAX_PACKET_SIZE,
      type: opts.family === "ipv4" ? "udp4" : "udp6",
    });
    this.socket.on("message", this.handleIncoming);
    return new Promise((resolve) => this.socket.bind(opts.port, opts.host, resolve));
  }

  public async stop(): Promise<void> {
    this.socket.off("message", this.handleIncoming);
    return new Promise((resolve) => this.socket.close(resolve));
  }

  public async send(to: Multiaddr, packet: Packet): Promise<void> {
    const nodeAddr = to.toOptions();
    return new Promise((resolve) => this.socket.send(encode(packet), nodeAddr.port, nodeAddr.host, () => resolve()));
  }

  public handleIncoming = (data: Buffer, rinfo: IRemoteInfo): void => {
    const multiaddr = Multiaddr(`/${rinfo.family === "IPv4" ? "ip4" : "ip6"}/${rinfo.address}/udp/${rinfo.port}`);
    try {
      const packet = decode(data, this.whoAreYouMagic);
      this.emit("packet", multiaddr, packet);
    } catch (e) {
      this.emit("decodeError", e, multiaddr);
    }
  };
}
