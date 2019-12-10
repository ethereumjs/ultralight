import { EventEmitter } from "events";
import { ITransportService, ISocketAddr } from "../transport";
import { PacketType, Packet, IWhoAreYouPacket, IAuthMessagePacket, IMessagePacket } from "../packet";
import { NodeId, ENR } from "../enr";
import { Session } from "./session";
import { IKeypair } from "../keypair";


/**
 * Session management for the Discv5 Discovery service.
 *
 * The `SessionService` is responsible for establishing and maintaining sessions with
 * connected/discovered nodes. Each node, identified by it's [`NodeId`] is associated with a
 * [`Session`]. This service drives the handshakes for establishing the sessions and associated
 * logic for sending/requesting initial connections/ENR's from unknown peers.
 *
 * The `SessionService` also manages the timeouts for each request and reports back RPC failures,
 * session timeouts and received messages. Messages are encrypted and decrypted using the
 * associated `Session` for each node.
 *
 * An ongoing connection is managed by the `Session` struct. A node that provides and ENR with an
 * IP address/port that doesn't match the source, is considered untrusted. Once the IP is updated
 * to match the source, the `Session` is promoted to an established state. RPC requests are not sent
 * to untrusted Sessions, only responses.
 */
export class SessionService extends EventEmitter {
  private enr: ENR;
  private keypair: IKeypair;
  private transport: ITransportService;
  private sessions: Map<NodeId, Session>;
  constructor(enr: ENR, keypair: IKeypair, transport: ITransportService) {
    super();
    this.enr = enr;
    this.keypair = keypair;
    this.transport = transport;
    this.sessions = new Map();
  }
  public async start(): Promise<void> {
    // @ts-ignore
    this.transport.on("packet", this.onPacket);
    await this.transport.start();
  }
  public async close(): Promise<void> {
    // @ts-ignore
    this.transport.removeListener("packet", this.onPacket);
    await this.transport.close();
  }
  public onWhoAreYou(from: ISocketAddr, packet: IWhoAreYouPacket): void {
  }
  public onAuthMessage(from: ISocketAddr, packet: IAuthMessagePacket): void {
  }
  public onMessage(from: ISocketAddr, packet: IMessagePacket): void {
  }
  public onPacket = (from: ISocketAddr, type: PacketType, packet: Packet): void => {
    switch (type) {
      case PacketType.WhoAreYou:
        return this.onWhoAreYou(from, packet as IWhoAreYouPacket);
      case PacketType.AuthMessage:
        return this.onAuthMessage(from, packet as IAuthMessagePacket);
      case PacketType.Message:
        return this.onMessage(from, packet as IMessagePacket);
    }
  };
}
