import { _UTPSocket } from "../..";
import { Duplex } from "stream";
import { UtpPacketDTO } from "../../Packets/UtpPacketDTO";

export default class BlockingQueue {
  socket: _UTPSocket;
  queue: UtpPacketDTO[];
  inBuffer: UtpPacketDTO[];
  expected: number;
  currentAckNumber: number;
  receiving: boolean;
  byteBuffer: Duplex;

  constructor(socket: _UTPSocket) {
    this.socket = socket
    this.queue = [];
    this.inBuffer = [];
    this.expected = 1;
    this.currentAckNumber = 1;
    this.receiving = true;
    this.byteBuffer = new Duplex();
  }
  enqueue(item: UtpPacketDTO): void {
    this.queue.push(item);
    this.expected++;
  }
  dequeue(): UtpPacketDTO | false {
    let p = this.queue.shift();
    return typeof p == "undefined" ? false : p
     
  }
  getItems(): UtpPacketDTO[] {
    return this.inBuffer;
  }
  isExpected(p: UtpPacketDTO): boolean {
    return p.utpPacket.header.seqNr === this.currentAckNumber + 1;
  }

  ack(ack_nr: number) {
    this.socket.sendAckPacket(ack_nr)
  }
  
  selectiveAck(ack_nr: number) {}
  
  alreadyAcked(p: UtpPacketDTO): boolean {
    return true;
  }

  getAllCorrectlySequencedPackets(): UtpPacketDTO[] {
    let packets = []
    let ack_nr = this.currentAckNumber;
    let packet = this.inBuffer.shift()
    while (packet?.utpPacket.header.seqNr == ack_nr) {
      packets.push(packet);
      ack_nr ++
      packet = this.inBuffer.shift()
    }
    return packets
  }

  receive(p: UtpPacketDTO) {
    if (this.isExpected(p)) {
      this.byteBuffer.push(p.utpPacket.payload);
      if (this.inBuffer.length == 0) {
        this.currentAckNumber = p.utpPacket.header.seqNr;
        this.ack(this.currentAckNumber);
      } else {
        let packets = this.getAllCorrectlySequencedPackets();
        packets.forEach((p) => {
          this.currentAckNumber = p.utpPacket.header.seqNr;
          this.byteBuffer.push(p.utpPacket.payload);
        });
        if (this.inBuffer.length == 0) {
          this.ack(this.currentAckNumber);
        } else {
          this.selectiveAck(this.currentAckNumber);
        }
      }
    } else {
      if (this.alreadyAcked(p)) {
        this.ack(this.currentAckNumber);
      } else {
        this.inBuffer.push(p);
        this.selectiveAck(this.currentAckNumber);
      }
    }
  }

  start() {
    while (this.receiving) {
     if (this.dequeue() ) {this.receive(this.dequeue() as UtpPacketDTO)};
    }
  }
}
