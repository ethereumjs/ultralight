import { MAX_PACKET_SIZE } from "@chainsafe/discv5/lib/packet";
import { MicrosecondTimeStamp, Packet, UINT16MAX, _UTPSocket } from "../..";
import { ArrayIndexOutOfBoundsException, InterruptedException, IOException } from "../../Utils/exceptions";
import BlockingQueue from "../congestionControl/blockingQueue";
import { SkippedPacketBuffer } from "../congestionControl/SkippedPacketBuffer";
import { UtpReadFuture } from "./UtpReadFuture";
import { UtpPacketDTO } from "../../Packets/UtpPacketDTO";

export class utpReadingRunnable {
  PACKET_DIFF_WARP: number;
  exp: IOException | null;
  socket: _UTPSocket;
  buffer: Buffer;
  skippedBuffer: SkippedPacketBuffer;
  exceptionOccured: boolean;
  gracefullInterrupt: boolean | undefined;
  isRunning: boolean;
  totalPayloadLength: number;
  lastPacketTimestamp: bigint | undefined;
  lastPayloadLength: number;
  lastPacketReceived: number;
  readFuture: UtpReadFuture;
  timestamper: () => bigint;
  nowTimestamp: bigint | undefined;
  startReadingTimeStamp: number;
  gotLastPacket: boolean;
  currentPackedAck: number;

  constructor(
    socket: _UTPSocket,
    buffer: Buffer,
    timestamp: number,
    readFuture: UtpReadFuture
  ) {
    this.PACKET_DIFF_WARP = 50000;
    this.socket = socket;
    this.buffer = buffer;
    this.timestamper = MicrosecondTimeStamp;
    this.readFuture = readFuture;
    this.exceptionOccured = false;
    this.skippedBuffer = new SkippedPacketBuffer();
    this.totalPayloadLength = 0;
    this.isRunning = false;
    this.lastPacketReceived = 0
    this.gotLastPacket = false;
    this.currentPackedAck = 0;
    this.lastPayloadLength = MAX_PACKET_SIZE;
    this.startReadingTimeStamp = performance.now();
    this.exp = null;
  }

  continueReading(): boolean {
    return (
      !this.gracefullInterrupt &&
      !this.exceptionOccured &&
      (!this.gotLastPacket ||
        this.hasSkippedPackets() ||
        !this.timeAwaitedAfterLastPacket())
    );
  }

  timeAwaitedAfterLastPacket() {
    return (
      MicrosecondTimeStamp() - (this.lastPacketTimestamp as bigint) > 2 && this.gotLastPacket
    );
  }

  hasSkippedPackets(): boolean {
    return !this.skippedBuffer.isEmpty();
  }

  getBytesRead() {
    return 0;
  }

  getException() {
    return this.exp;
  }

  hasExceptionOccured() {
    false;
  }
  

  run() {
      console.log("reading")
    this.isRunning = true;
    this.exp = null;
    while (this.continueReading()) {
      let queue = this.socket.queue;
        try {
            let Pair = queue.dequeue();
            this.nowTimestamp = MicrosecondTimeStamp()
            if (Pair) {
                this.currentPackedAck++;
                this.lastPacketReceived = Pair.stamp;
                if (this.isLastPacket(Pair)) {
                    this.gotLastPacket = true;
                    this.lastPacketTimestamp = MicrosecondTimeStamp()
                }
                if (this.isPacketExpected(Pair.utpPacket)) {
                    this.handleExpectedPacket(Pair)
                } else {
                    this.handleUnexpectedPacket(Pair)
                }
                if (this.ackThisPacket()) {
                    this.currentPackedAck = 0
                }
            }
            if (this.isTimedOut()) {
                if (!this.hasSkippedPackets()) {
                    this.gotLastPacket = true;
                } else {
                    throw new IOException()
                }
            }

        } catch (err) {
            if (err instanceof IOException || err instanceof InterruptedException || err instanceof ArrayIndexOutOfBoundsException)
            this.exp = err;
            // this.exp.printStackTrace();
            this.exceptionOccured = true
        } 

    }
    this.isRunning = false;
    this.readFuture.finished(this.exp, this.buffer)
    console.log("finished reading")
    this.socket.returnFromReading();
  }

  isTimedOut() {
      let timedOut =  Number(this.nowTimestamp) - this.lastPacketReceived >= 4000000
      let connectionReattemptAwaited = Number(this.nowTimestamp) - this.startReadingTimeStamp >= 4000000
      return timedOut && connectionReattemptAwaited
  }

  isLastPacket(Pair: UtpPacketDTO) {
    return (Pair.utpPacket.header.wndSize & 0XFFFFFFFF) == 0;
  }

  ackThisPacket(): boolean {
      let SKIP_PACKETS_UNTIL_ACK = 3
      if (this.currentPackedAck >= SKIP_PACKETS_UNTIL_ACK) {
          return true
      }
      return false
  }

  getLeftSpaceInBuffer() {
      return (this.skippedBuffer.getFreeSize() * this.lastPayloadLength)
  }

  getTimeStampDifference(Pair: UtpPacketDTO): number {
      let difference = Pair.bytes32TimeStamp - Pair.utpPacket.header.timestamp
      return difference
  }

  handleExpectedPacket(Pair: UtpPacketDTO) {
    
    if (this.hasSkippedPackets()) {
        this.buffer.write(Pair.utpPacket.payload.toString(), this.buffer.length)
        let payloadLength: number = Pair.utpPacket.payload.length
        this.lastPayloadLength = payloadLength;
        this.totalPayloadLength +=payloadLength;
        let packets = this.skippedBuffer.getAllUntillNextMissing();
        let lastSeqNumber = 0;
        if (packets.length == 0) {
            lastSeqNumber = Pair.utpPacket.header.seqNr & 0xFFFF
        }
        let lastPacket = null;
        packets.forEach((packet) => {
            this.buffer.write(packet.utpPacket.payload.toString(), this.buffer.length)
            payloadLength += packet.utpPacket.payload.length
            lastSeqNumber = packet.utpPacket.header.seqNr & 0xFFFF;
            lastPacket = packet.utpPacket
        })
        this.skippedBuffer.reindex(lastSeqNumber);
        this.socket.ackNr = lastSeqNumber;
        if (this.hasSkippedPackets()) {
            if (this.ackThisPacket()) {
                let headerExtension = this.skippedBuffer.calculateHeaderExtension();
                this.socket.sendSelectiveAck(headerExtension, this.getTimeStampDifference(Pair), this.getLeftSpaceInBuffer())
            }
        } else {
            if (this.ackThisPacket()) {
                this.socket.sendAckPacket(Pair.utpPacket.header.seqNr & 0xFFFF)
            } else {
                this.socket.ackNr = Pair.utpPacket.header.seqNr
            }
            this.buffer.write(Pair.utpPacket.payload.toString(), this.buffer.length)
            this.totalPayloadLength += Pair.utpPacket.payload.length
        }
    }
  }
  handleUnexpectedPacket(Pair: UtpPacketDTO) {
        let expected = this.getExpectedSeqNr();
        let seqNr = Pair.utpPacket.header.seqNr & 0xFFFF;
        if (this.skippedBuffer.isEmpty()) {
            this.skippedBuffer.setExpectedSequenceNumber(expected)
        }
        let alreadyAcked = expected > seqNr || seqNr - expected > this.PACKET_DIFF_WARP;
        let sameSeqNr = expected == this.skippedBuffer.expectedSequenceNumber;
        if (sameSeqNr && !alreadyAcked) {
            this.skippedBuffer.bufferPacket(Pair);
            let headerExtension = this.skippedBuffer.createHeaderExtension()
            if (this.ackThisPacket()) {
                this.socket.sendSelectiveAckPacket(headerExtension, this.getTimeStampDifference(Pair), this.getLeftSpaceInBuffer())
            }
        } else if (this.ackThisPacket()) {
            let headerExtension = this.skippedBuffer.createHeaderExtension();
            this.socket.ackAlreadyAcked(headerExtension, this.getTimeStampDifference(Pair), this.getLeftSpaceInBuffer());
        }
  }

  isPacketExpected(UtpPacket: Packet) {
      let seqNrFromPacket = UtpPacket.header.seqNr;
      return this.getExpectedSeqNr() == seqNrFromPacket
  }

  getExpectedSeqNr() {
      let ackNr = this.socket.ackNr;
      return ackNr == UINT16MAX ? 1 : ackNr + 1
  }

  gracefullyInterrupt() {
      this.gracefullInterrupt = true
  }

  
  start() {}
}
