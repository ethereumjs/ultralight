import { min } from "bn.js";
import { log } from "debug";
import { UtpProtocol } from "..";
import {
  Bytes32TimeStamp,
  MAX_PACKET_SIZE,
  Packet,
  PacketType,
  TWO_MINUTES,
  _UTPSocket,
} from "../..";
// import { UtpWriteFuture, UtpWriteFutureImpl } from "./UtpWriteFuture";

const MIN_RTO = TWO_MINUTES;
export default class utpWritingRunnable {
  utp: UtpProtocol;
  socket: _UTPSocket;
  content: Uint8Array;
  lastAckReceived: Packet;
  contentMod: Uint8Array;
  writing: boolean;
  finished: boolean;
  canSendNextPacket: boolean;
  // timedoutPackets: Packet[];
  // waitingTime: number;
  // rto: number;
  timestamp: number;
  sentBytes: Map<Packet, Uint8Array>;
  constructor(
    utp: UtpProtocol,
    socket: _UTPSocket,
    synAck: Packet,
    content: Uint8Array,
    timestamp: number
  ) {
    this.socket = socket;
    this.utp = utp;
    this.timestamp = timestamp;
    this.content = content
    this.contentMod = this.content;
    this.writing = false;
    this.finished = false;
    this.canSendNextPacket = true;
    // this.timedoutPackets = [];
    this.sentBytes = new Map<Packet, Uint8Array>();
    // this.waitingTime = 0;
    // this.rto = 0
    this.lastAckReceived = synAck;
  }

  async start(): Promise<void> {
    log(`starting to write`, this.content);
    this.writing = this.content && true;
    while (this.writing) {
      while (this.canSendNextPacket && !this.finished) {
        // let size = this.nextPacketSize();
        let bytes = this.getNextBytes(this.contentMod);
        this.socket.sendDataPacket(bytes).then((p: Packet) => {
          this.sentBytes.set(p, bytes);
        });
        if (this.contentMod.length == 0) {
            this.canSendNextPacket = false
            this.finished = true;
            this.writing = false;
            log("All Data Written");
            return
        }
      }
    }
  }

  nextPacketSize(): number {
    return this.contentMod.length > 900 ? 900 : this.contentMod.length;
  }

  getNextBytes(array: Uint8Array, idx: number = 100): Uint8Array {
    let next = array.subarray(0, 500);
    let rest = array.slice(500)
    log(`sending ${next.length} bytes...`);
    log(`${rest.length} bytes left`)
    this.setContentMod(rest);
    return next;
  }

  setContentMod(subArray: Uint8Array) {
    this.contentMod = subArray;
  }

  // getNextPacket(): Packet {
  //   return this.timedoutPackets.shift() as Packet;
  // }

  // calculateRTO(p: Packet) {
  //     this.socket.rtt_var += 0.25 * (Math.abs(this.socket.rtt - p.header.timestampDiff) - this.socket.rtt_var)
  //     this.socket.rtt += 0.125 * (p.header.timestampDiff - this.socket.rtt)
  //     this.rto = Math.max(MIN_RTO, this.socket.rtt + this.socket.rtt_var * 4)
  // }

  // sendPacket(p: Packet) {
  //     this.socket.sendPacket(p, PacketType.ST_DATA)
  // }

  // markPacketOnFly(p: Packet) {}

  // waitAndProcessAcks() {}

  // write() {
  //   while (this.writing) {
  //     while (this.canSendNextPacket) {
  //       let p = this.getNextPacket();
  //       this.sendPacket(p);
  //       this.markPacketOnFly(p);
  //     }
  //     this.waitAndProcessAcks();
  //     this.timedoutPackets.forEach((p) => {
  //       this.sendPacket(p);
  //     });
  //   }
  // }
}
