import { _UTPSocket } from "../Socket/_UTPSocket";
import { bufferToPacket, ConnectionState, Packet, randUint16 } from "..";
import { debug } from "debug";
import { PortalNetwork } from "../../..";
import { Discv5 } from "portalnetwork-discv5";

const log = debug("<uTP>");

export class UtpProtocol {
  portal: PortalNetwork
  sockets: Record<string, _UTPSocket>;
  client: Discv5;

  constructor(portal: PortalNetwork) {
    this.portal = portal
    this.client = portal.client;
    this.sockets = {};
  }

  async initiateConnectionRequest(dstId: string, data?:Uint8Array): Promise<number> {
    log(`Requesting uTP stream connection with ${dstId}`);
    const socket = new _UTPSocket(this, dstId);
    this.sockets[dstId] = socket;
    this.sockets[dstId].content = data && data;

    await this.sockets[dstId].sendSynPacket(data);
    return this.sockets[dstId].sndConnectionId;
  }

  async sendData(data: Uint8Array, dstId: string): Promise<void> {
    await this.initiateConnectionRequest(dstId, data);
  }

  async handleSynAck(ack: Packet, dstId: string): Promise<void> {
    log("Received ST_STATE packet...SYN acked...Connection established.");
    await this.sockets[dstId].handleSynAckPacket(ack);
  }

  async handleAck(packet: Packet, dstId: string): Promise<void> {
    log('seqnr: ' + packet.header.seqNr + "acknr:" + packet.header.ackNr + "Received ST_STATE packet from " + dstId);
    this.sockets[dstId].handleStatePacket(packet);
  }
  async handleFin(packet: Packet, dstId: string): Promise<void> {
    log("Received ST_FIN packet from " + dstId + "...uTP stream closing...");
    this.sockets[dstId].handleFinPacket(packet);
  }

  async handleIncomingConnectionRequest(
    packet: Packet,
    dstId: string
  ): Promise<void> {
    log(
      `Received incoming ST_SYN packet...uTP connection requested by ${dstId}`
    );
    let socket = new _UTPSocket(this, dstId);
    this.sockets[dstId] = socket;
    await this.sockets[dstId].handleIncomingConnectionRequest(packet);
    log(`uTP stream opened with ${dstId}`);
  }

  async handleIncomingData(packet: Packet, dstId: string): Promise<void> {
    log(`Receiving Data Packet from ${dstId}`);
    await this.sockets[dstId].handleDataPacket(packet);
    log(`Received Data Packet from ${dstId}`);
  }
}
