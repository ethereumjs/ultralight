import { Packet } from "..";

export class UtpPacketDTO {
    utpPacket: Packet
    packet: Packet
    stamp: number
    bytes32TimeStamp: number
    ackedAfterMeCounter: number
    isPacketAcked: boolean
    reduceWindow: boolean | undefined
    resendBecauseSkipped: boolean | undefined
    resendCounter: number
    constructor(utpPacket: Packet, packet: Packet, timestamp: number, bytes32TimeStamp: number) {
        this.stamp = timestamp;
        this.packet = packet;
        this.utpPacket = utpPacket;
        this.bytes32TimeStamp = bytes32TimeStamp
        this.ackedAfterMeCounter = 0
        this.isPacketAcked = false
        this.resendCounter = 0
        this.reduceWindow = undefined
        this.resendBecauseSkipped = undefined
    }

    setResendCounter(num: number) {
        this.resendCounter = num
    }

    setReduceWindow(bool: boolean) {
        this.reduceWindow = bool
    }

    setResendBecauseSkipped(bool: boolean) {
        this.resendBecauseSkipped = bool
    }

    incrementResendCounter(): void {
        this.resendCounter++
    }

    incrementAckedAfterMe(): void {
        this.ackedAfterMeCounter++
    }

    setPacketAcked(bool: boolean): void {
        this.isPacketAcked = bool
    }
     setAckedAfterMeCounter(number: number): void {
         this.ackedAfterMeCounter = number
     }

     setStamp(timestamp: number) {
         this.stamp = timestamp;
     }

     setDgPacket(p: Packet) {
         this.packet = p
     }



}





