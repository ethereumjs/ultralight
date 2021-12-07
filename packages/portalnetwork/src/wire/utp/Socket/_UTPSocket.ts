import {
  createAckPacket,
  createDataPacket,
  createFinPacket,
  createResetPacket,
  createSynPacket,
  DELAY_TARGET,
  MicrosecondTimeStamp,
  Packet,
  PacketType,
  randUint16,
  UINT16MAX,
  UtpProtocol,
  Bytes32TimeStamp,
} from "..";
import dgram from 'dgram'
import { ConnectionState } from ".";

import EventEmitter from "events";
import { Discv5 } from "@chainsafe/discv5";
import assert from "assert";
import { fromHexString } from "@chainsafe/ssz";
import { SubNetworkIds } from "../..";
import { debug } from "debug";
import {
  isDataPacket,
  isFinPacket,
  isResetPacket,
  isStatePacket,
  isSynAckPacket,
  isSynPacket,
} from "./socketFunctions";
import utpWritingRunnable from "../Protocol/write/utpWritingRunnable";
import { utpReadingRunnable } from "../Protocol/read/utpReadingRunnable";
import {
  UtpWriteFutureImpl,
} from "../Protocol/write/UtpWriteFuture";
import { UtpReadFuture } from "../Protocol/read/UtpReadFuture";
import BlockingQueue from "../Protocol/congestionControl/blockingQueue";

const log = debug("<uTP>");
const MAX_WINDOW = 1280;
const PacketSent = new EventTarget();
PacketSent.addEventListener("Packet Sent", (id) => {
  log("Packet sent to" + id);
});

export class _UTPSocket extends EventEmitter {
  remoteAddress: string;
  seqNr: number;
  client: Discv5;
  isOpen: boolean;
  queue: BlockingQueue;
  isReading: boolean;
  isWriting: boolean;
  connectionAttempts: number;
  utp: UtpProtocol;
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
  constructor(utp: UtpProtocol, remoteAddress: string) {
    super();
    this.client = utp.client;
    this.utp = utp;
    this.remoteAddress = remoteAddress;
    this.isOpen = true;
    this.queue = new BlockingQueue(this);
    this.isReading = false;
    this.isWriting = false;
    this.connectionAttempts = 0;
    this.seqNr = 1;
    this.ackNr = 0;
    this.rcvConnectionId = randUint16() & (UINT16MAX - 1);
    this.sndConnectionId = this.rcvConnectionId + 1;
    this.max_window = MAX_WINDOW;
    this.cur_window = 0;
    this.reply_micro = 0;
    this.state = null;
    this.rtt = 0;
    this.rtt_var = 0;
    this.baseDelay = 0;
    this.ourDelay = 0;
    this.sendRate = 0;
    this.CCONTROL_TARGET = DELAY_TARGET;
  }

  initiateAckPosition(sequenceNumber: number) {
    if (sequenceNumber == 0) {
      throw Error("sequence number cannot be 0");
    }
    if (sequenceNumber == 1) {
      this.ackNr = UINT16MAX;
    } else {
      this.ackNr = sequenceNumber - 1;
    }
  }

  async sendPacket(packet: Packet, type: PacketType): Promise<void> {
    let msg = packet.encodePacket();
    this.client.sendTalkReqSync(
      this.remoteAddress,
      msg,
      fromHexString(SubNetworkIds.UTPNetworkId)
    );
    log(`${PacketType[type]} packet sent to ${this.remoteAddress}.`);
    type === 1 && log("uTP stream closed.");
  }
  recievePacket(packet: Packet): void {
    if (isSynAckPacket(packet, this.state)) {
      this.handleSynAckPacket(packet);
    } else if (isResetPacket(packet)) {
      this.handleResetPacket(packet);
    } else if (isSynPacket(packet)) {
      this.handleIncomingConnectionRequest(packet);
    } else if (isDataPacket(packet)) {
      this.handleDataPacket(packet);
    } else if (isStatePacket(packet)) {
      this.handleStatePacket(packet);
    } else if (isFinPacket(packet)) {
      this.handleFinPacket(packet);
    } else {
      this.sendResetPacket();
    }
  }

  handlePacket(packet: Packet): void {
    // this.incrementSequenceNumber.offer(new UtpPacketDTO(packet, timestamp, packetTimestamp))
  }

  ackPacket(packet: Packet, timestampDiff: number, wnd_size: number): void {}

  // aka handle SYN packet
  async handleIncomingConnectionRequest(packet: Packet): Promise<void> {
    this.updateRTT(packet.header.timestampDiff);
    this.setConnectionIdsFromPacket(packet);
    this.seqNr = randUint16();
    this.ackNr = packet.header.seqNr;
    this.state = ConnectionState.SynRecv;
    this.seqNr++, await this.sendAckPacket();
  }
  handleSynAckPacket(packet: Packet): void {
    if ((packet.header.connectionId & UINT16MAX) === this.rcvConnectionId) {
      this.setState(ConnectionState.Connected);
      this.setAckNrFromPacketSeqNr(packet);
    }
  }
  handleResetPacket(packet: Packet): void {
    // this.close()
  }
  async handleDataPacket(packet: Packet): Promise<void> {
    this.updateRTT(packet.header.timestampDiff);
    this.ackNr = packet.header.seqNr;
    this.state = ConnectionState.Connected;
    this.seqNr++, await this.sendAckPacket();
  }
  handleStatePacket(packet: Packet): void {
    this.state = ConnectionState.Connected;
    this.ackNr = packet.header.seqNr;
  }
  handleFinPacket(packet: Packet): void {
    this.setState(ConnectionState.GotFin);
    this.ackNr = packet.header.seqNr;
  }

  returnFromReading() {}
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

  async sendAckPacket(ackNr: number = this.ackNr): Promise<void> {
    const packet = createAckPacket(
      this.seqNr,
      this.sndConnectionId,
      ackNr,
      this.rtt_var
    );
    log(
      `Sending ST_STATE packet ${packet.encodePacket().toString("hex")} to ${
        this.remoteAddress
      }`
    );
    await this.sendPacket(packet, PacketType.ST_STATE);
  }

  async sendSynPacket(): Promise<void> {
    assert(this.state === ConnectionState.SynSent);
    let packet = createSynPacket(this.rcvConnectionId, 1, this.ackNr);
    log(
      `Sending SYN packet ${packet.encodePacket().toString("hex")} to ${
        this.remoteAddress
      }...`
    );
    await this.sendPacket(packet, PacketType.ST_SYN);
    log(`SYN packet sent to ${this.remoteAddress}`);
  }

  async sendFinPacket() {
    let packet = createFinPacket(this.sndConnectionId, this.ackNr);
    log(`Sending FIN packet ${packet} to ${this.remoteAddress}`);
    await this.sendPacket(packet, PacketType.ST_FIN);
    this.seqNr = Number("eof_pkt");
    log(`FIN packet ${packet} sent to ${this.remoteAddress}`);
  }

  async sendResetPacket() {
    let packet = createResetPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr
    );
    log(`Sending RESET packet ${packet} to ${this.remoteAddress}`);
    await this.sendPacket(packet, PacketType.ST_RESET);
    log(`RESET packet ${packet} sent to ${this.remoteAddress}`);
  }

  async sendDataPacket(payload: Uint8Array): Promise<void> {
    let packet = createDataPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr,
      this.max_window,
      payload,
      this.rtt_var
    );
    log(`Sending DATA packet to ${this.remoteAddress}`, packet);
    await this.sendPacket(packet, PacketType.ST_DATA);
    log(`DATA packet ${packet} sent to ${this.remoteAddress}`);
  }

  startDataTransfer(data: Buffer) {
    // CCONTROL

    this.sendDataPacket(Uint8Array.from(data));
  }

  updateRTT(packetRTT: number) {
    this.rtt_var += Math.abs(this.rtt - packetRTT - this.rtt_var) / 4;
    this.rtt += (packetRTT - this.rtt) / 8;
  }

  getDataGramQueue() {
    return this.queue;
  }

  incrementSequenceNumber(): void {
    let sn = this.seqNr + 1;
    if (sn > UINT16MAX) {
      sn = 1;
    }
    this.seqNr = sn;
  }
  incrementConnectionAttemps(): void {
    this.connectionAttempts++;
  }
  setState(state: ConnectionState) {
    this.state = state;
  }
  setAckNrFromPacketSeqNr(p: Packet) {
    this.ackNr = p.header.seqNr;
  }
  setConnectionIdsFromPacket(p: Packet) {
    let id = p.header.connectionId;
    this.sndConnectionId = id;
    this.rcvConnectionId = id + 1;
  }
  validatePacketSize(packet: Packet): boolean {
    return packet.payload.length <= this.max_window;
  }

  write(src: Buffer) {
    let future: UtpWriteFutureImpl = new UtpWriteFutureImpl();
    let writer: utpWritingRunnable = new utpWritingRunnable(
      this.utp,
      this,
      src,
      Bytes32TimeStamp(),
      future
    );
    writer.start();
    return future;
  }

  read(dst: Buffer) {
    let readFuture: UtpReadFuture = new UtpReadFuture(dst);
    const reader = new utpReadingRunnable(
      this,
      dst,
      performance.now(),
      readFuture
    );
    reader.run();
    return readFuture;
  }

  ReadTest(socket: _UTPSocket) {
    let _log = debug("Read Test");
    _log("start Read Test");
    let buffer: Buffer = Buffer.alloc(150000000);
    while (true) {
      let readFuture: UtpReadFuture = socket.read(buffer);
      _log("Read Test End");
    }
  }
}
