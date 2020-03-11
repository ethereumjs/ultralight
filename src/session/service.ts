import {EventEmitter} from "events";
import {ISocketAddr, ITransportService} from "../transport";
import {
  createAuthTag,
  IAuthMessagePacket,
  IMessagePacket,
  IWhoAreYouPacket,
  Packet,
  PacketType
} from "../packet";
import {ENR, NodeId} from "../enr";
import {Session} from "./session";


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
  private transport: ITransportService;
  private sessions: Map<NodeId, Session>;
  constructor(enr: ENR, transport: ITransportService) {
    super();
    this.enr = enr;
    this.transport = transport;
    this.sessions = new Map();
  }

  /**
   * Starts the session service, starting the underlying UDP transport service.
   */
  public async start(): Promise<void> {
    this.transport.on("packet", this.onPacket);
    await this.transport.start();
  }

  /**
   * Closes the session service, stopping the underlying UDP transport service.
   */
  public async close(): Promise<void> {
    this.transport.removeListener("packet", this.onPacket);
    await this.transport.close();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
  public onWhoAreYou(from: ISocketAddr, packet: IWhoAreYouPacket): void {

  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
  public onAuthMessage(from: ISocketAddr, packet: IAuthMessagePacket): void {
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
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

  /**
   * Contact a peer.
   * @param enr the peer to contact.
   */
  public async addPeer(enr: ENR): Promise<void> {

    const existingSession = this.sessions.get(enr.nodeId);
    if (existingSession == null) {
      const tag = createAuthTag();
      const [session, randomPacket] = Session.createWithRandom(tag, enr);

      this.sessions.set(enr.nodeId, session);
      await this.transport.send({
        port: +enr.get("udp")!.toString(),
        address: enr.get("ip")!.toString()
      }, PacketType.AuthMessage, randomPacket);
    }

  }
}
