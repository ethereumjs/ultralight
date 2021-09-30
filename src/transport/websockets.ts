import ws from "ws";
import debug from "debug";
import { EventEmitter } from "events";
import { Multiaddr } from "multiaddr";
import { decodePacket, encodePacket, IPacket } from "../packet";
import { IRemoteInfo, ITransportService, TransportEventEmitter } from "./types";
import WebSocketAsPromised from "websocket-as-promised";

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

  private server: ws.Server | undefined = undefined;
  private srcId: string;
  private connections: {
    [multiaddr: string]: ISocketConnection;
  } = {};

  public constructor(multiaddr: Multiaddr, srcId: string) {
    super();

    const opts = multiaddr.toOptions();
    if (opts.transport !== "tcp") {
      throw new Error("Local multiaddr must use WSS or UDP");
    }
    this.multiaddr = multiaddr;
    this.srcId = srcId;
  }

  public async start(): Promise<void> {
    const opts = this.multiaddr.toOptions();
    if (this.isNode()) {
      this.server = new ws.Server({ host: opts.host, port: opts.port, clientTracking: true });
      this.server.on("connection", (connection, req) => {
        const remoteAddr = req.connection.remoteAddress;
        const remotePort = req.connection.remotePort;
        log(`new connection from ${remoteAddr}:${remotePort}`);
        // send public address and port back to browser client to update ENR
        connection.send(JSON.stringify({ address: remoteAddr, port: remotePort }));
        // adding the multiaddr to the socket so individual connections can be identified when sending messages to nodes
        /* eslint-disable @typescript-eslint/ban-ts-ignore */
        // @ts-ignore
        connection.multiAddr = `/ip4/${req.connection.remoteAddress}/tcp/${req.connection.remotePort}`;
        connection.on("message", (msg) => {
          this.handleIncoming(msg as Buffer, {
            address: req.connection.remoteAddress!,
            family: "IPv4",
            port: req.connection.remotePort!,
            size: 1024,
          });
        });
      });
    }
  }

  public async stop(): Promise<void> {
    if (this.isNode() && this.server) {
      this.server.off("message", this.handleIncoming);
      this.server.close();
    }
  }

  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    if (this.isNode()) {
      this.server?.clients.forEach((client: ws) => {
        // If websocket server exists, send packet to open socket corresponding to `to` if it exists
        //@ts-ignore
        if (to.toString().includes(client.multiAddr.toString())) {
          const encoded = encodePacket(toId, packet);
          client.send(encoded);
        }
      });
    } else {
      // Send via websocket (i.e. in browser)
      const connection = await this.getConnection(to);
      connection.sendPacked(encodePacket(toId, packet));
    }
  }

  public handleIncoming = (data: Buffer, rinfo: IRemoteInfo): void => {
    const multiaddr = new Multiaddr(`/${rinfo.family === "IPv4" ? "ip4" : "ip6"}/${rinfo.address}/tcp/${rinfo.port}`);
    try {
      const packet = decodePacket(this.srcId, data);
      this.emit("packet", multiaddr, packet);
    } catch (e) {
      this.emit("decodeError", e, multiaddr);
    }
  };

  private getConnection = async (multiaddress: Multiaddr): Promise<WebSocketAsPromised> => {
    const address = multiaddress.toString();
    if (this.connections[address]) {
      const socket = this.connections[address].connection;
      if (!socket.isOpened) {
        await socket.open();
      }
      return socket;
    } else {
      log("Opening new socket connection to %s", multiaddress.toString());
      const opts = multiaddress.toOptions();
      const url = `ws://${opts.host}:${opts.port}`;
      this.connections[address] = {
        multiaddr: multiaddress,
        connection: new WebSocketAsPromised(url, {
          packMessage: (data: Buffer) => data.buffer,
          unpackMessage: (data) => Buffer.from(data),
        }),
      };
      const socket = this.connections[multiaddress.toString()].connection;

      await socket.open();
      socket.ws.binaryType = "arraybuffer";
      this.emit("newSocketConnection", multiaddress);
      socket.onUnpackedMessage.addListener((msg) => {
        // Hack to drop public url reflection based messages from packet processing
        try {
          JSON.parse(msg);
          return;
        } catch {
          // eslint-disable-next-line no-empty
        }
        this.handleIncoming(msg, {
          address: opts.host,
          family: "IPv4",
          port: opts.port,
          size: msg.length,
        });
      });
      socket.onMessage.addListener((msg) => {
        try {
          const { address, port } = JSON.parse(msg);
          this.multiaddr = new Multiaddr(`/ip4/${address}/tcp/${port}`);
          this.emit("multiaddrUpdate", this.multiaddr);
          // eslint-disable-next-line no-empty
        } catch {}
      });
      socket.onClose.addListener(() => log("socket for %s closed", opts.host));
      return socket;
    }
  };

  // Check if environment is Node or no
  private isNode = (): boolean => {
    if (ws.Server) {
      return true;
    } else return false;
  };
}
