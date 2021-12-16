import {
  createAckPacket,
  createDataPacket,
  createFinPacket,
  createResetPacket,
  createSynPacket,
  DELAY_TARGET,
  Packet,
  PacketType,
  randUint16,
  UINT16MAX,
  UtpProtocol,
  Bytes32TimeStamp,
  DEFAULT_WINDOW_SIZE,
} from "..";
import { ConnectionState } from ".";

import EventEmitter from "events";
import { Discv5 } from "@chainsafe/discv5";
import { fromHexString } from "@chainsafe/ssz";
import { SubNetworkIds } from "../..";
import { debug } from "debug";
import utpWritingRunnable from "../Protocol/write/utpWritingRunnable";
import Reader from "../Protocol/read/Reader";

const log = debug("<uTP>");

export class _UTPSocket extends EventEmitter {
  utp: UtpProtocol;
  content: Uint8Array;
  remoteAddress: string;
  seqNr: number;
  client: Discv5;
  ackNr: number;
  sndConnectionId: number;
  rcvConnectionId: number;
  max_window: number;
  cur_window: number;
  reply_micro: number;
  state: ConnectionState | null;
  rtt: number;
  rtt_var: number;
  baseDelay: number;
  ourDelay: number;
  sendRate: number;
  CCONTROL_TARGET: number;
  writer: utpWritingRunnable | undefined;
  reader: Reader;
  readerContent: Uint8Array;
  constructor(utp: UtpProtocol, remoteAddress: string) {
    super();
    this.utp = utp;
    this.client = utp.client;
    this.remoteAddress = remoteAddress;
    this.rcvConnectionId = randUint16() & (UINT16MAX - 1);
    this.sndConnectionId = this.rcvConnectionId + 1;
    this.seqNr = 1;
    this.ackNr = 0;
    this.max_window = DEFAULT_WINDOW_SIZE;
    this.cur_window = this.max_window;
    this.reply_micro = 0;
    this.state = null;
    this.rtt = 0;
    this.rtt_var = 0;
    this.baseDelay = 0;
    this.ourDelay = 0;
    this.sendRate = 0;
    this.CCONTROL_TARGET = DELAY_TARGET;
    this.content = Uint8Array.from([]);
    this.reader = new Reader(this);
    this.readerContent = new Uint8Array();
  }

  async updateSocketFromPacketHeader(packet: Packet) {
    this.ackNr = packet.header.seqNr;
    this.updateRTT(packet.header.timestampDiff);
    this.cur_window = packet.header.wndSize;
  }

  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
    const msg = packet.encodePacket();
    await this.client.sendTalkReq(
      this.remoteAddress,
      msg,
      fromHexString(SubNetworkIds.UTPNetworkId)
    );
    log(`${PacketType[type]} packet sent to ${this.remoteAddress}.`);
    type === 1 && log("uTP stream clsed.");
    return msg;
  }

  // handles SYN packets
  async handleIncomingConnectionRequest(packet: Packet): Promise<void> {
    // sndConnectionId and rcvConnectionId calculated from packet header
    this.setConnectionIdsFromPacket(packet);
    // TODO: Figure out SeqNr and AckNr initializing and incrementation
    this.seqNr = randUint16();
    this.ackNr = packet.header.seqNr;
    log(`Setting Connection State: SynRecv`);
    this.state = ConnectionState.SynRecv;
    log(`Sending SYN ACK to accept connection request...`);
    await this.sendSynAckPacket();
    log(`Incrementing seqNr from ${this.seqNr} to ${this.seqNr + 1}`);
    // Increments seqNr (***????????*****)
    this.seqNr++;
  }

  async handleSynAckPacket(packet: Packet): Promise<void> {
    log(`SYN packet accepted.  SYN ACK Received.  Connection State: Connected`);
    this.setState(ConnectionState.Connected);
    log(`Sending SYN ACK ACK`);
    await this.sendAckPacket();
    log(`SYN ACK ACK sent...Reader listening for DATA stream...`);
  }

  async handleDataPacket(packet: Packet): Promise<void> {
    // Update socket from Packet Header
    this.updateSocketFromPacketHeader(packet);
    // Naive Solution -- Writes packet payload to content array (regardless of packet order)
    this.content = Uint8Array.from([...this.content, ...packet.payload]);
    log(`Connection State: Connected`);
    this.state = ConnectionState.Connected;
    log(`Sending packet payload to Reader`);
    await this.reader.addPacket(packet);
    // Send ACK if packet arrived in expected order.
    // TODO: Send SELECTIVE ACK if packet arrived out of order.
    // Call TIMEOUT if packet appears lost
    await this.sendAckPacket();
    log(`ACK sent for ${packet}`);
    log(`Incrementing seqNr from ${this.seqNr} to ${this.seqNr + 1}`);
    // Increments seqNr (***????????*****)
    this.seqNr++;
  }
  async handleStatePacket(packet: Packet): Promise<void> {
    // STATE packet is ACK for a specific DATA packet.
    // TODO: handle SELECTIVE ACK packet
    this.updateSocketFromPacketHeader(packet);
    this.state = ConnectionState.Connected;
    // The first STATE packet will be the SYN ACK (ackNr: 1) or the SYN ACK ACK (ackNr: Random + 1???)
    if (packet.header.ackNr == 1) {
      this.handleSynAckPacket(packet);
    } else {
      if (packet.header.seqNr == 2) {
        log(
          `SYN ACK ACK Received, seqNr: ${packet.header.seqNr}, ackNr: ${packet.header.ackNr}`
        );
        log(`Starting uTP data stream`);
        this.content && (await this.write(this.content, packet));
        // a STATE packet will ACK the FIN packet to close connection.
      } else if (packet.header.ackNr === (Number("eof_pkt") & 0xffff)) {
        log(`FIN acked`);
        return;
      } else {
        log(
          `DATA ACK Received, seqNr: ${packet.header.seqNr}, ackNr: ${packet.header.ackNr}`
        );
      }
    }
  }

  async handleFinPacket(packet: Packet): Promise<void> {
    log(`Setting Connection Stae: GotFin`);
    this.setState(ConnectionState.GotFin);
    this.updateSocketFromPacketHeader(packet);
    log(`Sending FIN ACK packet.`);
    await this.sendAckPacket();
    log(`Waiting for 0 in-flight packets.`);
    this.readerContent = await this.reader.run();
    log(`Packet payloads compiled`);
    // await this.client.sendTalkResp(dstId, msgId, new Uint8Array())
  }

  // TODO
  // Handle SELECTIVE ACK
  // Send SELECTIVE ACK
  // Already ACKED packets

  sendSelectiveAck(
    headerExtension: unknown,
    timestampDiff: number,
    spaceLeftInBuffer: number
  ) {}

  sendSelectiveAckPacket(
    headerExtension: unknown,
    timestampDiff: number,
    spaceLeftInBuffer: number
  ) {}

  ackAlreadyAcked(
    headerExtension: unknown,
    timestampDiff: number,
    spaceLeftInBuffer: number
  ) {}

  async sendAckPacket(): Promise<void> {
    const packet = createAckPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    );
    log(
      `Sending ST_STATE packet ackNr: ${this.ackNr} seqNr: ${this.seqNr} to ${this.remoteAddress}`
    );
    await this.sendPacket(packet, PacketType.ST_STATE);
  }
  async sendSynAckPacket(): Promise<void> {
    this.seqNr = randUint16()
    const packet = createAckPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    );
    log(
      `Sending SYN ACK -  seqNr: (random) ackNr: ${this.ackNr}  to ${this.remoteAddress}`
    );
    await this.sendPacket(packet, PacketType.ST_STATE);
    log(`Incrementing SeqNr from ${this.seqNr} to ${this.seqNr + 1}`);
    // *******************??????????????????????**********************
    this.seqNr++;
  }

  async sendSynPacket(connectionId: number): Promise<Buffer> {
    // Initiates a uTP connection from a ConnectionId
    this.rcvConnectionId = connectionId;
    this.ackNr = randUint16();
    log(`Initializing ackNr to random Uint16.......${this.ackNr}`);
    let packet = createSynPacket(this.rcvConnectionId, 1, this.ackNr);
    log(
      `Sending SYN packet seqNr: 1 ackNr: ${this.ackNr} to ${this.remoteAddress}...`
    );
    return this.sendPacket(packet, PacketType.ST_SYN).then((buffer) => {
      log(`SYN packet sent to ${this.remoteAddress}`);
      log(`Incrementing SeqNr from ${this.seqNr} to ${this.seqNr + 1}`);
      // *******************??????????????????????**********************
      this.seqNr++;
      return buffer;
    });
  }

  async sendFinPacket(): Promise<void> {
    let packet = createFinPacket(
      this.sndConnectionId,
      this.ackNr,
      this.cur_window
    );
    log(`Sending FIN packet ${packet} to ${this.remoteAddress}`);
    log(`Incrementing SeqNr from ${this.seqNr} to ${this.seqNr + 1}`);
    // *******************??????????????????????**********************
    this.seqNr++;
    await this.sendPacket(packet, PacketType.ST_FIN);
    log(`FIN packet ${packet} sent to ${this.remoteAddress}`);
  }

  async sendResetPacket() {
    let packet = createResetPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr
    );
    log(
      `Sending RESET packet seqNr: ${this.seqNr} ackNr: ${this.ackNr} to ${this.remoteAddress}`
    );
    log(`Incrementing SeqNr from ${this.seqNr} to ${this.seqNr + 1}`);
    // *******************??????????????????????**********************
    this.seqNr++;
    await this.sendPacket(packet, PacketType.ST_RESET);
    log(`RESET packet ${packet} sent to ${this.remoteAddress}`);
  }

  async sendDataPacket(payload: Uint8Array): Promise<Packet> {
    let packet = createDataPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr,
      this.max_window,
      payload,
      this.rtt_var
    );
    log(
      `Sending DATA packet seqNr: ${this.seqNr} ackNr: ${this.ackNr} to ${this.remoteAddress}`,
      packet.payload
    );
    await this.sendPacket(packet, PacketType.ST_DATA);
    log(`Incrementing SeqNr from ${this.seqNr} to ${this.seqNr + 1}`);
    // *******************??????????????????????**********************
    this.seqNr++;
    return packet;
  }

  startDataTransfer(data: Uint8Array, synAck: Packet) {
    log(
      `Beginning transfer of ${data.slice(0, 20)}...to ${this.remoteAddress}`
    );
    // TODO: Why am I sending ack packet to writer?
    this.write(data, synAck);
  }

  updateRTT(packetRTT: number) {
    // Updates Round Trip Time (Time between sending DATA packet and receiving ACK packet)
    this.rtt_var += Math.abs(this.rtt - packetRTT - this.rtt_var) / 4;
    this.rtt += (packetRTT - this.rtt) / 8;
  }

  incrementSequenceNumber(): void {
    let sn = this.seqNr + 1;
    if (sn > UINT16MAX) {
      sn = 1;
    }
    this.seqNr = sn;
  }

  setState(state: ConnectionState) {
    this.state = state;
  }

  setConnectionIdsFromPacket(p: Packet) {
    let id = p.header.connectionId;
    this.sndConnectionId = id;
    this.rcvConnectionId = id + 1;
  }

  async write(content: Uint8Array, synAck: Packet): Promise<void> {
    let writer: utpWritingRunnable = new utpWritingRunnable(
      this.utp,
      this,
      synAck,
      content,
      Bytes32TimeStamp()
    );
    this.writer = writer;
    this.writer.start().then((res) => {
      log(`All Data sent...  Building FIN Packet...`);
      this.sendFinPacket();
    });
  }
}
