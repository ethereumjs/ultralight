import { _UTPSocket } from "../Socket/_UTPSocket";
import { bufferToPacket, ConnectionState, Packet, PacketType, randUint16 } from "..";
import { debug } from "debug";
import { PortalNetwork } from "../../..";
import { Discv5 } from "@chainsafe/discv5";

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

  async handleUtpPacket(packet: Packet, srcId: string ,msgId: bigint): Promise<void> {
    switch (packet.header.pType) {

      case PacketType.ST_SYN: await this.handleSynPacket(packet, srcId, msgId); break;
      case PacketType.ST_DATA: await this.handleDataPacket(packet, srcId, msgId); break;
      case PacketType.ST_STATE: await this.handleAckPacket(packet, srcId, msgId); break;
      case PacketType.ST_RESET: log('got RESET packet'); break;
      case PacketType.ST_FIN: await this.handleFinPacket(packet, srcId, msgId);
      break;
  }
  }

  async initiateConnectionRequest(dstId: string, id: number): Promise<Buffer> {
    // 
    log(`Requesting uTP stream connection with ${dstId}`);
    const socket = new _UTPSocket(this, dstId);
    this.sockets[dstId] = socket;
    return this.sockets[dstId].sendSynPacket(id)
    
  }

  async handleSynPacket(
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

  async handleSynAck(ack: Packet, dstId: string): Promise<void> {
    log("Received ST_STATE packet...SYN acked...Connection established.");
    await this.sockets[dstId].handleSynAckPacket(ack);
  }

  async handleAckPacket(packet: Packet, dstId: string, msgId: bigint): Promise<void> {
    log('seqnr: ' + packet.header.seqNr + "acknr:" + packet.header.ackNr + "Received ST_STATE packet from " + dstId);
    this.sockets[dstId].handleStatePacket(packet);
  }
  async handleFinPacket(packet: Packet, dstId: string, msgId: bigint): Promise<Uint8Array> {
    log("Received ST_FIN packet from " + dstId + ".  Waiting for in flight ST_DATA packets...");
    await this.sockets[dstId].handleFinPacket(packet, dstId, msgId)
    this.contents[dstId] = this.sockets[dstId].content
    log(`${this.contents[dstId].length} bytes received. ${this.contents[dstId].toString().slice(0, 20)} ...`)
    log(`${this.sockets[dstId].readerContent.toString().slice(0,20)}`)
    return this.contents[dstId]
  }


  async handleDataPacket(packet: Packet, dstId: string, msgId: bigint): Promise<void> {
    // this.sockets[dstId].content = Uint8Array.from([...this.sockets[dstId].content, ...packet.payload])
    log(`received CONTENT seqNr: ${packet.header.seqNr} ${packet.header.ackNr} packet${packet.payload.length} Bytes: ${packet.payload.slice(0, 10)}... `)
    await this.sockets[dstId].handleDataPacket(packet)
    }
  }

