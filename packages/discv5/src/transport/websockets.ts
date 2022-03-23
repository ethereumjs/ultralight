import debug from "debug";
import { EventEmitter } from "events";
import { Multiaddr } from "multiaddr";
import { decodePacket, encodePacket, IPacket } from "../packet";
import { IRemoteInfo, ITransportService, TransportEventEmitter } from "./types";
import WebSocketAsPromised from "websocket-as-promised";
import WebSocket from "isomorphic-ws";
import ip from "@leichtgewicht/ip-codec";
import { numberToBuffer } from "..";
const log = debug("discv5:transport");

interface ISocketConnection {
  multiaddr: Multiaddr;
  connection: WebSocketAsPromised;
}

/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over Websockets
 */
export class WebSocketTransportService
  extends (EventEmitter as { new (): TransportEventEmitter })
  implements ITransportService
{
  public multiaddr: Multiaddr;

  private socket: WebSocketAsPromised;
  private srcId: string;

  public constructor(multiaddr: Multiaddr, srcId: string, proxyAddress: string) {
    super();

    const opts = multiaddr.toOptions();
    if (opts.transport !== "udp") {
      throw new Error("Local multiaddr must use udp");
    }
    this.multiaddr = multiaddr;
    this.srcId = srcId;
    this.socket = new WebSocketAsPromised(proxyAddress, {
      packMessage: (data: Buffer) => data.buffer,
      unpackMessage: (data) => data, // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      //@ts-ignore
      createWebSocket: (url) => new WebSocket(url),
      extractMessageData: (event) => event,
    });
  }

  public async start(): Promise<void> {
    await this.socket.open();
    this.socket.ws.binaryType = "arraybuffer";
    this.socket.onMessage.addListener((msg: MessageEvent | ArrayBuffer) => {
      const data = msg instanceof MessageEvent ? Buffer.from(msg.data) : Buffer.from(msg);

      if (data.length === 6) {
        const address = ip.decode(data.slice(0, 4));
        const port = data.readUIntBE(4, 2);
        this.multiaddr = new Multiaddr(`/ip4/${address}/udp/${port}`);
        this.emit("multiaddrUpdate", this.multiaddr);
      } else {
        this.handleIncoming(data);
      }
    });
    this.socket.onClose.addListener(() => log("socket to proxy closed"));
  }

  public async stop(): Promise<void> {
    await this.socket.close();
  }

  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    // Send via websocket (i.e. in browser)
    const opts = to.toOptions();
    const encodedPacket = encodePacket(toId, packet);
    const encodedAddress = ip.encode(opts.host);
    const encodedPort = numberToBuffer(opts.port, 2);
    const encodedMessage = new Uint8Array([
      ...Uint8Array.from(encodedAddress),
      ...Uint8Array.from(encodedPort),
      ...Uint8Array.from(encodedPacket),
    ]);
    this.socket.sendPacked(encodedMessage);
  }

  public handleIncoming = (data: Uint8Array): void => {
    const rinfoLength = parseInt(data.slice(0, 2).toString());
    const rinfo = JSON.parse(new TextDecoder().decode(data.slice(2, rinfoLength + 2))) as IRemoteInfo;
    const multiaddr = new Multiaddr(`/${rinfo.family === "IPv4" ? "ip4" : "ip6"}/${rinfo.address}/udp/${rinfo.port}`);
    const packetBuf = Buffer.from(data.slice(2 + rinfoLength));
    try {
      const packet = decodePacket(this.srcId, packetBuf);
      this.emit("packet", multiaddr, packet);
    } catch (e) {
      this.emit("decodeError", e as Error, multiaddr);
    }
  };
}
