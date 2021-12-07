import { _UTPSocket } from "../Socket/_UTPSocket";
import { bufferToPacket, ConnectionState, Packet, randUint16 } from "..";
import { Discv5 } from "@chainsafe/discv5";
import { debug } from "debug";
import { PortalNetwork } from "../../..";

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

  async initiateConnectionRequest(dstId: string): Promise<number> {
    log(`Requesting uTP stream connection with ${dstId}`);
    const socket = new _UTPSocket(this, dstId);
    this.sockets[dstId] = socket;

    await this.sockets[dstId].sendSynPacket();
    return this.sockets[dstId].sndConnectionId;
  }

  async sendData(data: Buffer, dstId: string): Promise<void> {
    this.sockets[dstId].startDataTransfer(data);
  }

  async handleSynAck(ack: Packet, dstId: string): Promise<void> {
    log("Received ST_STATE packet...SYN acked...Connection established.");
    this.sockets[dstId].handleSynAckPacket(ack);
  }

  async handleAck(packet: Packet, dstId: string): Promise<void> {
    log("Received ST_STATE packet from " + dstId);
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
