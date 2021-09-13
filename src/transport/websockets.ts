import debug from "debug";
import { EventEmitter } from "events";
import { Multiaddr } from "multiaddr";
import { decodePacket, encodePacket, IPacket } from "../packet";
import { IRemoteInfo, ITransportService, TransportEventEmitter } from "./types";
import WebSocketAsPromised from "websocket-as-promised";
import ip from "@leichtgewicht/ip-codec";
const log = debug("discv5:transport");
import rlp from "rlp";
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
  private connections: {
    [multiaddr: string]: ISocketConnection;
  } = {};

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
      unpackMessage: (data) => Buffer.from(data),
    });
  }

  public async start(): Promise<void> {
    await this.socket.open();
    this.socket.ws.binaryType = "arraybuffer";

    this.socket.onUnpackedMessage.addListener((msg) => {
      // Hack to drop public url reflection based messages from packet processing
      try {
        JSON.parse(msg);
        return;
      } catch {
        // eslint-disable-next-line no-empty
      }
      this.handleIncoming(msg);
    });
    this.socket.onMessage.addListener((msg) => {
      try {
        const { address, port } = JSON.parse(msg);
        this.multiaddr = new Multiaddr(`/ip4/${address}/udp/${port}`);
        this.emit("multiaddrUpdate", this.multiaddr);
        // eslint-disable-next-line no-empty
      } catch { }
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
    const encodedAddress = ip.encode(opts.host)
    const encodedPort = Buffer.from(opts.port.toString())
    console.log(ip.encode(opts.host));
    console.log(Buffer.from(opts.port.toString()));
    const encodedMessage = [
      ...Uint8Array.from(encodedAddress),
      ...Uint8Array.from(encodedPort),
      ...Uint8Array.from(encodedPacket),
    ];
    console.log(encodedMessage)
    this.socket.sendPacked(encodedMessage);
  }

  public handleIncoming = (data: Buffer[]): void => {
    const decoded = rlp.decode(data);
    const rinfo = JSON.parse(decoded[0].toString()) as IRemoteInfo;
    const multiaddr = new Multiaddr(`/${rinfo.family === "IPv4" ? "ip4" : "ip6"}/${rinfo.address}/tcp/${rinfo.port}`);
    try {
      const packet = decodePacket(this.srcId, decoded[1]);
      this.emit("packet", multiaddr, packet);
    } catch (e) {
      this.emit("decodeError", e, multiaddr);
    }
  };
}
