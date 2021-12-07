import { DELAY_TARGET, MAX_CWND_INCREASE_PACKETS_PER_RTT, _UTPSocket } from "../..";
import BlockingQueue from "./blockingQueue";

export class CongestionControl {
    baseDelay: number
    ourDelay: number
    sendRate: number
    CCONTROL_TARGET: number
    offTarget: number
    maxWindow: number
    outstandingPacket: number
    MAX_CWND_INCREASE_PACKETS_PER_RTT: number
    queue: BlockingQueue
    constructor(socket:_UTPSocket) {
        this.baseDelay=0;
        this.ourDelay=0;
        this.sendRate=0;
        this.CCONTROL_TARGET=DELAY_TARGET;
        this.offTarget=0;
        this.maxWindow=1280;
        this.outstandingPacket=0;
        this.MAX_CWND_INCREASE_PACKETS_PER_RTT= MAX_CWND_INCREASE_PACKETS_PER_RTT
        this.queue = new BlockingQueue(socket)
    }

    delayFactor() {
        return this.offTarget / this.CCONTROL_TARGET
    }

    windowFactor() {
        return 
    }
}