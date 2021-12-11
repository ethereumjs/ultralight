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
  bufferToPacket,
} from "..";
import dgram from 'dgram'
import { ConnectionState } from ".";

import EventEmitter from "events";
import { Discv5 } from "portalnetwork-discv5";
import assert from "assert";
import { fromHexString } from "@chainsafe/ssz";
import { ContentMessageType, MessageCodes, PortalWireMessageType, SubNetworkIds } from "../..";
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
import BlockingQueue from "../Protocol/congestionControl/blockingQueue";

const log = debug("<uTP>");
const MAX_WINDOW = 1200;
const PacketSent = new EventTarget();
PacketSent.addEventListener("Packet Sent", (id) => {
  log("Packet sent to" + id);
});

export class _UTPSocket extends EventEmitter {
  content: Uint8Array | undefined
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
  writer: utpWritingRunnable | undefined;
  reader: utpReadingRunnable | undefined;
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


  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
    let msg = packet.encodePacket();

      this.client.sendTalkReqSync(
        this.remoteAddress,
msg,
        fromHexString(SubNetworkIds.UTPNetworkId)
      )
        log(`${PacketType[type]} packet sent to ${this.remoteAddress}.`);
        // this.seqNr++
      type === 1 && log("uTP stream clsed.");

       return msg
  }
  // recievePacket(packet: Packet): void {
  //   if (isSynAckPacket(packet, this.state)) {
  //     this.handleSynAckPacket(packet);
  //   } else if (isResetPacket(packet)) {
  //     this.handleResetPacket(packet);
  //   } else if (isSynPacket(packet)) {
  //     this.handleIncomingConnectionRequest(packet);
  //   } else if (isDataPacket(packet)) {
  //     this.handleDataPacket(packet);
  //   } else if (isStatePacket(packet)) {
  //     this.handleStatePacket(packet);
  //   } else if (isFinPacket(packet)) {
  //     this.handleFinPacket(packet);
  //   } else {
  //     this.sendResetPacket();
  //   }
  // }

  handlePacket(packet: Packet): void {
    // this.incrementSequenceNumber.offer(new UtpPacketDTO(packet, timestamp, packetTimestamp))
  }

  ackPacket(packet: Packet, timestampDiff: number, wnd_size: number): void {}

  // aka handle SYN packet
  async handleIncomingConnectionRequest(packet: Packet): Promise<void> {
    this.updateRTT(packet.header.timestampDiff);
    this.setConnectionIdsFromPacket(packet);
    this.seqNr = randUint16();
    this.ackNr = packet.header.seqNr
    this.state = ConnectionState.SynRecv;
    this.reader = new utpReadingRunnable(this, packet)
    await this.sendAckPacket()
      log(`SYN  ACK'ed`)
      this.seqNr++; 
    ;
  }
  async handleSynAckPacket(packet: Packet): Promise<void> {
      this.setState(ConnectionState.Connected);
      this.sendAckPacket()
    // this.content && this.startDataTransfer(this.content, packet);

  }
  handleResetPacket(packet: Packet): void {
    // this.close()
  }
  async handleDataPacket(packet: Packet): Promise<void> {
    this.updateRTT(packet.header.timestampDiff);
    this.ackNr = packet.header.seqNr;
    this.state = ConnectionState.Connected;
    this.seqNr++;
    this.reader?.packets.push(packet)
    this.sendAckPacket().then((res) => {
      log(`ack sent for ${packet}`)
    })
  }
  async handleStatePacket(packet: Packet): Promise<void> {
    this.initiateAckPosition(packet.header.seqNr)
    this.state = ConnectionState.Connected;
    if (packet.header.ackNr == 1) {
      log("syn ack received")
      this.handleSynAckPacket(packet)
    } else {
      if (packet.header.seqNr == 1) {
        log(`SYN ACK ACK Received, seqNr: ${packet.header.seqNr}, ackNr: ${packet.header.ackNr}`)
        log(`Starting uTP data stream`)
        this.content && await this.write(this.content, packet)
      } else {
        log(`DATA ACK Received, seqNr: ${packet.header.seqNr}, ackNr: ${packet.header.ackNr}`)
        this.sendFinPacket().then((res) => {
          return
        })
      }
    }
  }

  handleFinPacket(packet: Packet): void {
    this.setState(ConnectionState.GotFin);
    this.ackNr = packet.header.seqNr;
    this.client.sendTalkResp(this.remoteAddress, BigInt(this.sndConnectionId), new Uint8Array())
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

  async sendAckPacket(): Promise<void> {
    const packet = createAckPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    );
    log(
      `Sending ST_STATE packet ${this.ackNr} / ${this.seqNr} to ${
        this.remoteAddress
      }`
    );
    await this.sendPacket(packet, PacketType.ST_STATE);
  }

  async sendSynPacket(id: number): Promise<Buffer> {
    this.rcvConnectionId = id
    let packet = createSynPacket(this.rcvConnectionId, 1, this.ackNr);
    log(
      `Sending SYN packet ${packet.encodePacket().toString("hex")} to ${
        this.remoteAddress
      }...`
    );
    return this.sendPacket(packet, PacketType.ST_SYN).then((buffer) => {
      log(`SYN packet sent to ${this.remoteAddress}`);
      return buffer
    })

  }

  async sendFinPacket(): Promise<void> {
    let packet = createFinPacket(this.sndConnectionId, this.ackNr, this.cur_window);
    log(`Sending FIN packet ${packet} to ${this.remoteAddress}`);
    await this.sendPacket(packet, PacketType.ST_FIN);
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

  async sendDataPacket(payload: Uint8Array, last?: boolean): Promise<Packet> {
    let packet = createDataPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr,
      this.max_window,
      payload,
      this.rtt_var
    );
    let msg = packet.encodePacket()
    log(`Sending DATA packet to ${this.remoteAddress}`, packet.payload);
    // await this.client.sendTalkResp(this.remoteAddress, message.id, Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(msg)]))
    // this.client.sendTalkReq(this.remoteAddress, Buffer.concat([Buffer.from([MessageCodes.CONTENT]), msg]), fromHexString(SubNetworkIds.UTPNetworkId)).then((res) => {

    // })
    await this.sendPacket(packet, PacketType.ST_DATA);
    log(`DATA packet ${packet} sent to ${this.remoteAddress}`);
    return packet
      
  }

  startDataTransfer(data: Uint8Array, synAck: Packet) {
    log("Beginning transfer of" + data);
    this.write(
      data,
      synAck
    )


    // this.sendDataPacket(Uint8Array.from(data));
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

  setConnectionIdsFromPacket(p: Packet) {
    let id = p.header.connectionId;
    this.sndConnectionId = id;
    this.rcvConnectionId = id + 1;
  }
  validatePacketSize(packet: Packet): boolean {
    return packet.payload.length <= this.max_window;
  }

  async write(content: Uint8Array, synAck: Packet): Promise<void> {
    let writer: utpWritingRunnable = new utpWritingRunnable(
      this.utp,
      this,
      synAck,
      content,
      Bytes32TimeStamp(),
    );
    this.writer = writer;
    this.writer.start().then((res) => {
      log(`done writing`)
    })
  }

  read(synAck: Packet) {
    const reader = new utpReadingRunnable(
      this,
      synAck,
    );
    reader.run();
  }

  ReadTest(socket: _UTPSocket) {
    let _log = debug("Read Test");
    _log("start Read Test");
    let buffer: Buffer = Buffer.alloc(150000000);
    while (true) {
      _log("Read Test End");
    }
  }
}
