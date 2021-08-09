import ws from "ws";
import debug from "debug";
import { EventEmitter } from "events";
import { Multiaddr } from "multiaddr";
import { createRandomPacket, decodePacket, encodePacket, IPacket } from "../packet";
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
      throw new Error("Local multiaddr must use WSS");
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

        // adding the multiaddr to the socket so individual connections can be identified when sending messages to nodes
        /* eslint-disable @typescript-eslint/ban-ts-ignore */
        // @ts-ignore
        connection.multiAddr = `/ip4/${req.connection.remoteAddress}/tcp/${req.connection.remotePort}/ws`;
        connection.on("message", (msg) => {
          log("server received message");
          //@ts-ignore
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
    console.log('sending message to', to, packet.header)
    let sentFromServer = false;
    this.server?.clients.forEach((client: ws) => {
      // If websocket server exists, send packet to open socket corresponding to to if it exists
      log("trying to send message from server");
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      //@ts-ignore
      if (client.multiAddr.toString() == to.toString()) {
        sentFromServer = true;
        client.send(encodePacket(toId, packet!));
        log("sending message from server");
      }
    });

    // if message sent from server, return early
    if (sentFromServer) {
      return;
    }
    // Tries to create a new socket if not already sent via server
    const connection = await this.getConnection(to);

    //connection.send(encodePacket(toId, packet));
    if (connection.ws.readyState === connection.ws.OPEN) {
      connection.send("hi from socket");
    }
  }

  public handleIncoming = (data: Buffer, rinfo: IRemoteInfo): void => {
    log("handling inbound message", data, rinfo);
    console.log("handling inbound message", data);
    const multiaddr = new Multiaddr(
      `/${rinfo.family === "IPv4" ? "ip4" : "ip6"}/${rinfo.address}/tcp/${rinfo.port}/wss`
    );
    try {
      const packet = decodePacket(this.srcId, data);
      this.emit("packet", multiaddr, packet);
    } catch (e) {
      this.emit("decodeError", e, multiaddr);
    }
  };

  private getConnection = async (multiaddress: Multiaddr): Promise<WebSocketAsPromised> => {
    if (this.connections[multiaddress.toString()]) {
      return this.connections[multiaddress.toString()].connection;
    } else {
      console.log("getting new socket connection -", multiaddress.toString());
      const opts = multiaddress.toOptions();
      const url = `ws://${opts.host}:${opts.port}`;
      this.connections[multiaddress.toString()] = {
        multiaddr: multiaddress,
        connection: new WebSocketAsPromised(url),
      };
      const socket = this.connections[multiaddress.toString()].connection;
      await socket.open();
      socket.onMessage.addListener((msg) => {
        console.log("got message from: ", opts.host, opts.port);
        this.handleIncoming(msg as Buffer, {
          address: opts.host,
          family: "IPv4",
          port: opts.port,
          size: 1024,
        });
      });
      return this.connections[multiaddress.toString()].connection;
    }
  };

  // Check if environment is Node or no
  private isNode = (): boolean => {
    if (ws.Server) {
      return true;
    } else return false;
  };
}
