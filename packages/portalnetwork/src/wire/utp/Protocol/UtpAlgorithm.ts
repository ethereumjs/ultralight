import { MAX_PACKET_SIZE } from "@chainsafe/discv5/lib/packet";
import {
  C_CONTROL_TARGET_MICROS,
  DEFAULT_WINDOW_SIZE,
  MAX_CWND_INCREASE_PACKETS_PER_RTT,
  MINIMUM_TIMEOUT_MILLIS,
  ONLY_POSITIVE_GAIN,
  Packet,
  UINT16MAX,
  Bytes32TimeStamp,
  AUTO_ACK_SMALLER_THAN_ACK_NUMBER,
  DEF_HEADER_LENGTH,
  MICROSECOND_WAIT_BETWEEN_BURSTS,
  MINIMUM_DELTA_TO_MAX_WINDOW_MICROS,
  MAX_BURST_SEND,
  SEND_IN_BURST,
  MIN_PACKET_SIZE,
} from "..";
import { UtpPacketDTO } from "../Packets/UtpPacketDTO";
import MinimumDelay from "./congestionControl/MinimumDelay";
import OutPacketBuffer from "./congestionControl/OutPacketBuffer";
import UtpStatisticLogger from "./congestionControl/StatisticsLogger";
import {
  SelectiveAckHeaderExtension,
  UtpHeaderExtension,
} from "../Packets/Extentions";

export default class UtpAlgorithm {
  currentWindow: number;
  maxWindow: number;
  minDelay: MinimumDelay;
  buffer: OutPacketBuffer;
  timeStamper: number;
  currentAckPosition: number;
  currentBurstSend: number;
  lastZeroWindow: number | undefined;
  bBuffer: Uint8Array | undefined;
  rtt: number;
  rtt_var: number;
  advertisedWindowSize: number | undefined;
  advertisedWindowSizeSet: boolean;
  statisticLogger: UtpStatisticLogger;
  lastTimeWindowReduced: number | undefined;
  timeStampNow: number;
  lastAckReceived: number;
  resendPackets: number;
  totalPackets: number;
  lastMaxedOutWindow: number | undefined;

  constructor(timestamper: number, address: string) {
    this.currentWindow = 0;
    this.minDelay = new MinimumDelay();
    this.currentAckPosition = 0;
    this.currentBurstSend = 0;
    this.maxWindow = DEFAULT_WINDOW_SIZE;
    this.rtt = MINIMUM_TIMEOUT_MILLIS * 2;
    this.rtt_var = 0;
    this.advertisedWindowSizeSet = false;
    this.resendPackets = 0;
    this.totalPackets = 0;
    this.timeStamper = timestamper;
    this.buffer = new OutPacketBuffer();
    // this.buffer.setRemoteAccess(address)
    this.timeStampNow = Bytes32TimeStamp();
    this.lastAckReceived = 0;
    this.statisticLogger = new UtpStatisticLogger();
  }

  setOutPacketBuffer(outBuffer: OutPacketBuffer) {
    this.buffer = outBuffer;
  }

  ackReceived(pair: UtpPacketDTO) {
    let seqNrToAck: number = pair.utpPacket.header.ackNr & 0xffff;
    this.timeStampNow = Bytes32TimeStamp();
    this.lastAckReceived = this.timeStampNow;
    let advertisedWindow = pair.utpPacket.header.wndSize & 0xffffffff;
    this.updateAdvertisedWindowSize(advertisedWindow);
    this.statisticLogger.ackReceived(seqNrToAck);
    let packetSizeJustAcked = this.buffer.markPacketAcked(
      seqNrToAck,
      this.timeStampNow,
      AUTO_ACK_SMALLER_THAN_ACK_NUMBER
    );
    if (packetSizeJustAcked > 0) {
      this.updateRtt(this.timeStampNow, seqNrToAck);
      this.updateWindow(
        pair.utpPacket,
        this.timeStampNow,
        packetSizeJustAcked,
        pair.bytes32TimeStamp
      );
    }
    let selectiveAckExtension: SelectiveAckHeaderExtension | null =
      this.findSelectiveAckExtension(pair.utpPacket);
    if (selectiveAckExtension != null) {
      let windowAlreadyUpdated: boolean = false;
      let bitMask: Uint8Array = selectiveAckExtension.bitmask;
      for (let i = 0; i < bitMask.length; i++) {
        for (let j = 2; j < 10; j++) {
          if (selectiveAckExtension.isBitMarked(bitMask[i], j)) {
            let sackSeqNr = i * 8 + j + seqNrToAck;
            if (sackSeqNr > UINT16MAX) {
              sackSeqNr -= UINT16MAX;
            }
            this.statisticLogger.sACK(sackSeqNr);
            packetSizeJustAcked = this.buffer.markPacketAcked(
              sackSeqNr,
              this.timeStampNow,
              false
            );
            if (packetSizeJustAcked > 0 && !windowAlreadyUpdated) {
              windowAlreadyUpdated = true;
              this.updateRtt(this.timeStampNow, sackSeqNr);
              this.updateWindow(
                pair.utpPacket,
                this.timeStampNow,
                packetSizeJustAcked,
                pair.bytes32TimeStamp
              );
            }
          }
        }
      }
    }
    this.statisticLogger.next();
  }

  // findSelectiveAckExtension(packet: Packet): SelectiveAckExtension | null {
  //     return null
  // }

  // updateWindow(packet: Packet, timeStampNow: number, packetSizeJustAcked: number, bytes32TimeStamp: number) {

  // }

  // updateRtt(timestamp: number, seqNrToAck: number) {

  // }

  // updateAdvertisedWindowSize(size: number) {}

  updateRtt(timestamp: number, seqNrToAck: number) {
    let sendTimeStamp = this.buffer.getSendTimeStamp(seqNrToAck);
    if (this.rttUpdateNecessary(sendTimeStamp, seqNrToAck)) {
      let packetRtt = (timestamp - sendTimeStamp) / 1000;
      let delta = this.rtt - packetRtt;
      this.rtt_var += (Math.abs(delta) - this.rtt_var) / 4;
      this.rtt += (packetRtt - this.rtt) / 8;
      this.statisticLogger.pktRtt(packetRtt);
      this.statisticLogger.rttVar(this.rtt_var);
      this.statisticLogger.rtt(this.rtt);
    }
  }

  rttUpdateNecessary(sendTimeStamp: number, seqNrToAck: number): boolean {
    return sendTimeStamp != -1 && this.buffer.getResendCounter(seqNrToAck) == 0;
  }

  updateAdvertisedWindowSize(advertisedWindow: number): void {
    if (!this.advertisedWindowSizeSet) {
      this.advertisedWindowSizeSet = true;
    }
    this.advertisedWindowSize = advertisedWindow;
  }
  updateWindow(
    utpPacket: Packet,
    timestamp: number,
    packetSizeJustAcked: number,
    utpRecieved: number
  ): void {
    this.statisticLogger.microSecTimeStamp(this.timeStampNow);
    this.currentWindow = this.buffer.getBytesOnfly();

    if (this.isWondowFull()) {
      this.lastMaxedOutWindow = Number(this.timeStampNow);
    }

    this.statisticLogger.currentWindow(this.currentWindow);

    let ourDifference = utpPacket.header.timestampDiff & 0xffffffff;
    this.statisticLogger.ourDifference(ourDifference);
    this.updateOurDelay(ourDifference);

    let theirDifference: number = utpRecieved - utpPacket.header.timestamp;

    this.statisticLogger.theirDifference(theirDifference);
    this.updateTheirDelay(theirDifference);
    this.statisticLogger.theirMinDelay(this.minDelay.getTheirMinDelay());

    let ourDelay = ourDifference - this.minDelay.getCorrectedMinDelay();
    this.minDelay.addSample(ourDelay);
    this.statisticLogger.minDelay(this.minDelay.getCorrectedMinDelay());
    this.statisticLogger.ourDelay(ourDelay);

    let offTarget = C_CONTROL_TARGET_MICROS - ourDelay;
    this.statisticLogger.offTarget(offTarget);
    let delayFactor = offTarget / C_CONTROL_TARGET_MICROS;
    this.statisticLogger.delayFactor(delayFactor);
    let windowFactor =
      Math.min(packetSizeJustAcked, this.maxWindow) /
      Math.max(this.maxWindow, packetSizeJustAcked);
    this.statisticLogger.windowFactor(windowFactor);
    let gain: number =
      MAX_CWND_INCREASE_PACKETS_PER_RTT * delayFactor * windowFactor;

    if (this.setGainToZero(gain)) {
      gain = 0;
    }

    this.statisticLogger.gain(gain);
    this.maxWindow += gain;
    if (this.maxWindow < 0) {
      this.maxWindow = 0;
    }

    //		console.debug("current:max " + currentWindow + ":" + maxWindow);
    this.statisticLogger.maxWindow(this.maxWindow);
    this.statisticLogger.advertisedWindow(this.advertisedWindowSize as number);
    this.buffer.setResendtimeOutMicros(this.getTimeOutMicros());

    if (this.maxWindow == 0) {
      this.lastZeroWindow = this.timeStampNow;
    }
    // get bytes successfully transmitted:
    // this is the position of the bytebuffer (comes from programmer)
    // substracted by the amount of bytes on fly (these are not yet acked)
    let bytesSend =
      (this.bBuffer?.length as number) - this.buffer.getBytesOnfly();
    this.statisticLogger.bytesSend(bytesSend);

    //		maxWindow = 10000;
  }

  setGainToZero(gain: number) {
    // if i have ever reached lastMaxWindow then check if its longer than 1kk micros
    // if not, true
    let lastMaxWindowNeverReached =
      (this.lastMaxedOutWindow &&
        this.lastMaxedOutWindow != 0 &&
        this.lastMaxedOutWindow - Number(this.timeStampNow) >=
          MINIMUM_DELTA_TO_MAX_WINDOW_MICROS) ||
      this.lastMaxedOutWindow == 0;
    if (lastMaxWindowNeverReached) {
      console.log("last maxed window: setting gain to 0");
    }
    return (ONLY_POSITIVE_GAIN && gain < 0) || lastMaxWindowNeverReached;
  }

  updateTheirDelay(theirDifference: number) {
    this.minDelay.updateTheirDelay(theirDifference, this.timeStampNow);
  }

  getTimeOutMicros() {
    return Math.max(
      this.getEstimatedRttMicros(),
      MINIMUM_TIMEOUT_MILLIS * 1000
    );
  }

  getEstimatedRttMicros() {
    return this.rtt * 1000 + this.rtt_var * 4 * 1000;
  }

  updateOurDelay(difference: number) {
    this.minDelay.updateOurDelay(difference, this.timeStampNow);
  }
  /**
   * Checks if packets must be resend based on the fast resend mechanism or a transmission timeout.
   * @return All packets that must be resend
   */
  getPacketsToResend(): Packet[] {
    this.timeStampNow = Bytes32TimeStamp();
    let queue: Packet[] = [];
    let toResend: UtpPacketDTO[] =
      this.buffer.getPacketsToResend(MAX_BURST_SEND);
    toResend.forEach((utpPacketDTO: UtpPacketDTO) => {
      queue.push(utpPacketDTO.packet);
      //			console.debug("Resending: " + utpPacketDTO.utpPacket().toString() );
      utpPacketDTO.incrementResendCounter();
      if (utpPacketDTO.reduceWindow) {
        if (this.reduceWindowNecessary()) {
          let lastTimeWindowReduced = this.timeStampNow;
          this.maxWindow *= 0.5;
        }
        utpPacketDTO.reduceWindow = false;
      }
    });
    this.resendPackets += queue.length;
    return queue;
  }

  reduceWindowNecessary() {
    if (this.lastTimeWindowReduced == 0) {
      return true;
    }

    let delta =
      this.lastTimeWindowReduced &&
      ((Number(this.timeStampNow) - this.lastTimeWindowReduced) as number);
    return delta && delta > this.getEstimatedRttMicros();
  }

  findSelectiveAckExtension(
    utpPacket: Packet
  ): SelectiveAckHeaderExtension | null {
    let extensions: UtpHeaderExtension[] = utpPacket.getExtensions();
    if (extensions == null) {
      return null;
    }
    for (let i = 0; i < extensions.length; i++) {
      if (extensions[i] instanceof SelectiveAckHeaderExtension) {
        return extensions[i] as SelectiveAckHeaderExtension;
      }
    }
    return null;
  }

  /**
   * Returns true if a packet can NOW be send
   */
  canSendNextPacket() {
    if (
      this.timeStampNow - (this.lastZeroWindow as number) >
        this.getTimeOutMicros() &&
      this.lastZeroWindow != 0 &&
      this.maxWindow == 0
    ) {
      console.debug(
        "setting window to one packet size. current window is:" +
          this.currentWindow
      );
      this.maxWindow = MAX_PACKET_SIZE;
    }
    let windowNotFull = !this.isWondowFull();
    let burstFull = false;

    if (windowNotFull) {
      burstFull = this.isBurstFull();
    }

    if (!burstFull && windowNotFull) {
      this.currentBurstSend++;
    }

    if (burstFull) {
      this.currentBurstSend = 0;
    }
    return SEND_IN_BURST ? !burstFull && windowNotFull : windowNotFull;
  }

  isBurstFull() {
    return this.currentBurstSend >= MAX_BURST_SEND;
  }

  isWondowFull() {
    let maximumWindow =
      this.advertisedWindowSize &&
      this.advertisedWindowSize < this.maxWindow &&
      this.advertisedWindowSizeSet
        ? this.advertisedWindowSize
        : this.maxWindow;
    return this.currentWindow >= maximumWindow;
  }

  sizeOfNextPacket(): number {
    return this.calculateDynamicLinearPacketSize();
  }

  calculateDynamicLinearPacketSize() {
    let packetSizeDelta = MAX_PACKET_SIZE - MIN_PACKET_SIZE;
    let minDelayOffTarget =
      C_CONTROL_TARGET_MICROS - this.minDelay.getRecentAverageDelay();
    minDelayOffTarget = minDelayOffTarget < 0 ? 0 : minDelayOffTarget;
    let packetSizeFactor = minDelayOffTarget / C_CONTROL_TARGET_MICROS;
    let packetSize = MIN_PACKET_SIZE + packetSizeFactor * packetSizeDelta;
    return Math.ceil(packetSize);
  }

  // markPacketOnfly(utpPacket: Packet, dgPacket: any) {
  // 	this.timeStampNow = Bytes32TimeStamp();
  // 	let  pkt = new UtpPacketDTO(dgPacket, utpPacket, this.timeStampNow, 0);
  // 	this.buffer.bufferPacket(pkt);
  // 	this.incrementAckNumber();
  // 	this.addPacketToCurrentWindow(utpPacket);
  // 	this.totalPackets++;

  // }

  incrementAckNumber() {
    if (this.currentAckPosition == UINT16MAX) {
      this.currentAckPosition = 1;
    } else {
      this.currentAckPosition++;
    }
  }

  // /**
  //  * informs the algorithm that the fin packet was send.
  //  */
  // markFinOnfly(fin: Packet) {
  // 	this.timeStampNow = Bytes32TimeStamp();
  // 	let finBytes = packetToBuffer( fin)
  // 	let dgFin = new Packet({});
  // 	let pkt = new UtpPacketDTO(dgFin, fin, this.timeStampNow, 0);
  // 	this.buffer.bufferPacket(pkt);
  // 	this.incrementAckNumber();
  // 	this.addPacketToCurrentWindow(fin);
  // }

  addPacketToCurrentWindow(pkt: Packet) {
    this.currentWindow += DEF_HEADER_LENGTH;
    if (pkt.payload != null) {
      this.currentWindow += pkt.payload.length;
    }
  }

  areAllPacketsAcked(): boolean {
    return this.buffer.isEmpty();
  }

  toBinaryString(value: number) {
    return (value & 0xFF).toString(2)
  }

  removeAcked() {
    this.buffer.removeAcked();
    this.currentWindow = this.buffer.getBytesOnfly();
  }

  getLeftElements() {
    return this.buffer.getSequenceOfLeft();
  }

  /**
   * Returns the number of micro seconds the writing thread should wait at most based on: timed out packets and window utilisation
   * @return micro seconds.
   */
  getWaitingTimeMicroSeconds() {
    let oldestTimeStamp = this.buffer.getOldestUnackedTimestamp();
    let nextTimeOut = oldestTimeStamp + this.getTimeOutMicros();
    this.timeStampNow = Bytes32TimeStamp();
    let timeOutInMicroSeconds = nextTimeOut - this.timeStampNow;
    if (this.continueImmidiately(timeOutInMicroSeconds, oldestTimeStamp)) {
      return 0;
    }
    if (!this.isWondowFull() || this.maxWindow == 0) {
      return MICROSECOND_WAIT_BETWEEN_BURSTS;
    }
    return timeOutInMicroSeconds;
  }

  continueImmidiately(
    timeOutInMicroSeconds: number,
    oldestTimeStamp: number
  ) {
    return timeOutInMicroSeconds < 0 && oldestTimeStamp != 0;
  }

  /**
   * terminates.
   * @param bytesSend
   * @param successfull
   */
  end(bytesSend: number, successfull: boolean) {
    if (successfull) {
      this.statisticLogger.end(bytesSend);
      console.debug(
        "Total packets send: " +
          this.totalPackets +
          ", Total Packets Resend: " +
          this.resendPackets
      );
    }
  }

  resetBurst() {
    this.currentBurstSend = 0;
  }

  /**
   * returns true when a socket timeout happened. (the reciever does not answer anymore)
   */
  isTimedOut() {
    if (
      this.timeStampNow - this.lastAckReceived > this.getTimeOutMicros() * 5 &&
      this.lastAckReceived != 0
    ) {
      console.debug("Timed out!");
      return true;
    }
    return false;
  }

  setMaxWindow(window: number) {
    this.maxWindow = window;
  }

  getMaxWindow() {
    return this.maxWindow;
  }

  getCurrentWindow() {
    return this.currentWindow;
  }

  setByteBuffer(bBuffer: Uint8Array) {
    this.bBuffer = bBuffer;
  }

  setCurrentWindow(i: number) {
    this.currentWindow = i;
  }

  setEstimatedRtt(i: number) {
    this.rtt = i;
  }
}
