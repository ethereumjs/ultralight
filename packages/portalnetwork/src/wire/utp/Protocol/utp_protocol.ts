import { _UTPSocket } from "../Socket/_UTPSocket";
import { bufferToPacket, ConnectionState, Packet, PacketType, randUint16 } from "..";
import { debug } from "debug";
import { PortalNetwork } from "../../..";
import { Discv5 } from "portalnetwork-discv5";

const log = debug("<uTP>");

export class UtpProtocol {
  portal: PortalNetwork
  sockets: Record<string, _UTPSocket>;
  client: Discv5;
  contents: Record<string, Uint8Array>

  constructor(portal: PortalNetwork) {
    this.portal = portal
    this.client = portal.client;
    this.sockets = {};
    this.contents = {}
  }

  // async handleUtpPacket(dstId: string, msg: Buffer) {
  //   let packet = bufferToPacket(msg)
  //   let pType = packet.header.pType
  //   if (pType === PacketType.ST_SYN) {
  //     this.handleIncomingConnectionRequest(packet, dstId)
  //   }
  //   if (pType === PacketType.ST_DATA) {
  //     this.handleAck(packet, dstId)
  //   }
  //   if (pType === PacketType.ST_DATA) {
  //     this.handleIncomingData(packet, dstId)
  //   }
  // }

  async initiateConnectionRequest(dstId: string, id: number): Promise<Buffer> {
    log(`Requesting uTP stream connection with ${dstId}`);
    const socket = new _UTPSocket(this, dstId);
    this.sockets[dstId] = socket;
    // this.sockets[dstId].content = data && data;

    return this.sockets[dstId].sendSynPacket(id)
    
  }

  // async sendData(data: Uint8Array, dstId: string): Promise<Buffer> {
  //   return await this.initiateConnectionRequest(dstId, data);
  // }

  async handleSynAck(ack: Packet, dstId: string): Promise<void> {
    log("Received ST_STATE packet...SYN acked...Connection established.");
    await this.sockets[dstId].handleSynAckPacket(ack);
  }

  async handleAck(packet: Packet, dstId: string, msgId: bigint): Promise<void> {
    log('seqnr: ' + packet.header.seqNr + "acknr:" + packet.header.ackNr + "Received ST_STATE packet from " + dstId);
    this.sockets[dstId].handleStatePacket(packet);
  }
  async handleFin(packet: Packet, dstId: string, msgId: bigint): Promise<Uint8Array | undefined> {
    log("Received ST_FIN packet from " + dstId + "...uTP stream closing...");
    await this.sockets[dstId].handleFinPacket(packet, dstId, msgId);
    return this.sockets[dstId].content
  }

  async handleIncomingConnectionRequest(
    packet: Packet,
    dstId: string,
    msgId: bigint
  ): Promise<void> {
    log(
      `Received incoming ST_SYN packet...uTP connection requested by ${dstId}`
    );
    let socket = new _UTPSocket(this, dstId);
    this.sockets[dstId] = socket;
    this.sockets[dstId].content = this.contents[dstId];
    await this.sockets[dstId].handleIncomingConnectionRequest(packet)
      log(`uTP stream request accepted.  Sending ACK.  Preparing to send ${this.contents}`);
    }

  async handleIncomingData(packet: Packet, dstId: string, msgId: bigint): Promise<void> {
    log(`Receiving Utp Packet from ${dstId}`);
    this.sockets[dstId].content = Uint8Array.from([...this.sockets[dstId].content, ...packet.payload])
    log(`received CONTENT seqNr: ${packet.header.seqNr} ${packet.header.ackNr} packet${packet.payload.length} Bytes: ${packet.payload.slice(0, 10)}... `)
    this.client.sendTalkResp(dstId, msgId, new Uint8Array()).then((res) => {
      this.sockets[dstId].handleDataPacket(packet).then((res) => {
      })
    })
  }
}
