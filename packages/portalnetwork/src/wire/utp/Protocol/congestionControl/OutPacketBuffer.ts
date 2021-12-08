import debug from "debug";
import { packetToBuffer, UINT16MAX, Bytes32TimeStamp, DEF_HEADER_LENGTH, MIN_SKIP_PACKET_BEFORE_RESEND } from "../..";
import { UtpPacketDTO } from "../../Packets/UtpPacketDTO";

export default class OutPacketBuffer {
	_log: debug.Debugger
    constructor() {
		this._log = debug("OutPacketBuffer")
	}
	private static size: number = 3000;
	private buffer: UtpPacketDTO[] = new Array(
			OutPacketBuffer.size);
	private bytesOnFly: number = 0;
	private resendTimeOutMicros: number | undefined;

	

	public getResendTimeOutMicros(): number {
		return this.resendTimeOutMicros as number;
	}

	public setResendtimeOutMicros(timeOutMicroSec: number): void {
		this.resendTimeOutMicros = timeOutMicroSec;
	}

	private currentTime: number = Bytes32TimeStamp();


	/**
	 * Puts a packet in the buffer.
	 * @param the packet.
	 */
	public bufferPacket(pkt: UtpPacketDTO): void {
		this.buffer.push(pkt);
		if (pkt.utpPacket.payload != null) {
			this.bytesOnFly += pkt.utpPacket.payload.length;
		}
		this.bytesOnFly += DEF_HEADER_LENGTH;
	}

	public isEmpty(): boolean {
		return this.buffer.length === 0;
	}
	/**
	 * Used to tell the buffer that packet was acked
	 * @param seqNrToAck the sequence number that has been acked
	 * @param timestamp now time stamp
	 * @param ackSmallerThanThisSeq if true, ack all packets lower than this sequence number, if false, only ack this sequence number.
	 * @return bytes acked. negative there was no packed with that sequence number. 
	 */
	public markPacketAcked(seqNrToAck: number, timestamp: number, ackSmallerThanThisSeq: boolean ): number {
		let bytesJustAcked: number = -1;
		let pkt: UtpPacketDTO | null = this.findPacket(seqNrToAck);
		if (pkt != null) {
			if ((pkt.utpPacket.header.seqNr & 0xFFFF) == seqNrToAck) {
				if (!pkt.isPacketAcked) {
					let payloadLength: number = pkt.utpPacket.payload == null ? 0
							: pkt.utpPacket.payload.length;
					bytesJustAcked = payloadLength
							+ DEF_HEADER_LENGTH;
				}
				pkt.setPacketAcked(true);
				if (ackSmallerThanThisSeq) {
					this.buffer.forEach((toAck : UtpPacketDTO ) => {
						if ((toAck.utpPacket.header.seqNr & 0xFFFF) !== seqNrToAck) {
							toAck.setPacketAcked(true);
							
						}
					})
				}
			} else {
				console.error("ERROR FOUND WRONG SEQ NR: " + seqNrToAck
						+ " but returned "
						+ (pkt.utpPacket.header.seqNr & 0xFFFF));
			}
		}
		return bytesJustAcked;
	}

	private findPacket(seqNrToAck: number): UtpPacketDTO | null {

		if (this.buffer.length > 0) {
			let firstSeqNr: number = this.buffer[0].utpPacket.header.seqNr & 0xFFFF;
			let index: number = seqNrToAck - firstSeqNr;
			if (index < 0) {
				// overflow in seq nr
				index += UINT16MAX;
			}

			if (index < this.buffer.length
					&& (this.buffer[index].utpPacket.header.seqNr & 0xFFFF) == seqNrToAck) {
				return this.buffer[index];
			} else {
				// bug -> search sequentially until fixed
				for (let i = 0; i < this.buffer.length; i++) {
					let pkt: UtpPacketDTO = this.buffer[i]
					if ((pkt.utpPacket.header.seqNr & 0xFFFF) == seqNrToAck) {
						return pkt;
					}
				}
			}
			return null;
		}

		return null;

	}
	
	/**
	 * Removes all acked packets up to the first unacked packet.
	 */
	public removeAcked(): void {
		let toRemove = new Array(OutPacketBuffer.size)
		this.buffer.forEach((pkt : UtpPacketDTO ) => {
			if (pkt.isPacketAcked) {
				// we got the header, remove it from the bytes that are on the
				// wire
				this.bytesOnFly -= DEF_HEADER_LENGTH;
				if (pkt.utpPacket.payload != null) {
					// in case of a data packet, subtract the payload
					this.bytesOnFly -= pkt.utpPacket.payload.length;
				}
				toRemove.push(pkt);
			} 
		})
		this.buffer = this.buffer.filter((n) => !toRemove.includes(n))
	}

	/**
	 * Returns all packets that timed out or that should be resend by fast resend.
	 * @param maxResend maximum number of packets to resend.
	 * @return Queue with all packets that must be resend. 
	 * @throws SocketException
	 */
	public getPacketsToResend(maxResend: number): UtpPacketDTO[]
			{
		let currentTime = Bytes32TimeStamp();
		let unacked: UtpPacketDTO[] = []
		this.buffer.forEach((pkt : UtpPacketDTO ) => {
			if (!pkt.isPacketAcked) {
				unacked.push(pkt);
			} else {
				unacked.forEach( ( unackedPkt : UtpPacketDTO) => {
					unackedPkt.incrementAckedAfterMe();
				})
			}

		})
		let toReturn: UtpPacketDTO[] = []

		unacked.forEach(( unackedPkt : UtpPacketDTO) => {
			if (this.resendRequired(unackedPkt) && toReturn.length <= maxResend) {
				toReturn.push(unackedPkt);
//				console.debug("Resending: " + (unackedPkt.utpPacket().getSequenceNumber() & 0xFFFF));
				this.updateResendTimeStamps(unackedPkt);
			}
			unackedPkt.setAckedAfterMeCounter(0);
		})

		return toReturn;

	}

	private updateResendTimeStamps(unackedPkt: UtpPacketDTO ): void
			{
		unackedPkt.utpPacket.header.timestamp = Bytes32TimeStamp();
		let newBytes: Uint8Array = packetToBuffer(unackedPkt.utpPacket)
		// TB: why create new datagram packet, can't it be reused?
		// TODO: ukackedPacket.datagram.getData()[x] = newtimestamp[0]
		// 		 ukackedPacket.datagram.getData()[x + 1] = newtimestamp[1]
		// 		 ukackedPacket.datagram.getData()[x + 2] = newtimestamp[2]
		// 		 ukackedPacket.datagram.getData()[x + 3] = newtimestamp[3]
		// unackedPkt.setDgPacket(new DatagramPacket(newBytes, newBytes.length,
		// 		this.addr));
		unackedPkt.setStamp(this.currentTime);
	}

	private resendRequired(unackedPkt: UtpPacketDTO ): boolean {
		let fastResend: boolean = false;
		if (unackedPkt.ackedAfterMeCounter >= MIN_SKIP_PACKET_BEFORE_RESEND) {
			if (!unackedPkt.resendBecauseSkipped) {
				fastResend = true;
				unackedPkt.setResendBecauseSkipped(true);
			}
		}
		let timedOut: boolean = this.isTimedOut(unackedPkt);

		if (!timedOut && fastResend) {
			unackedPkt.setReduceWindow(false);
		}
		if (timedOut && !unackedPkt.reduceWindow) {
			unackedPkt.setReduceWindow(true);
		}

		return fastResend || timedOut;
	}

	public getBytesOnfly(): number {
		return this.bytesOnFly;
	}

	private isTimedOut(utpPacketDTO: UtpPacketDTO ): boolean {
		let delta: number = this.currentTime - utpPacketDTO.stamp;
		// if (delta > timeOutMicroSec) {
		// console.debug("timed out so resending: " +
		// (utpPacketDTO.utpPacket().getSequenceNumber() & 0xFFFF));
		// }
		return delta > (this.resendTimeOutMicros as number);
	}

	// helper method
	public getSequenceOfLeft(): String {
		let returnString: String = "";
		this.buffer.forEach( (el : UtpPacketDTO ) => {
			returnString += " " + (el.utpPacket.header.seqNr & 0xFFFF);
		})
		return returnString.trim();
	}

	/**
	 * @return the timestamp of the oldest unacked packet. 
	 */
	public getOldestUnackedTimestamp(): number {
		if (this.buffer.length !== 0) {
			let timeStamp: number = 0xFFFFFFFF;
			this.buffer.forEach((pkt: UtpPacketDTO) => {
				if (pkt.stamp < timeStamp && !pkt.isPacketAcked) {
					timeStamp = pkt.stamp;
				}
			})
			return timeStamp;
		}
		return 0;
	}
	
	/**
	 * Returns the timestamp when this packet was send. 
	 * @param seqNrToAck the seq. number. 
	 */
	public getSendTimeStamp(seqNrToAck: number): number {
		let pkt: UtpPacketDTO | null = this.findPacket(seqNrToAck);
		if (pkt != null) {
			return pkt.stamp;
		}
		return -1;
	}

	// public setRemoteAdress(addr: String): void {
	// 	this.addr = addr;

	// }
	/**
	 * @param seqNrToAck packet with that sequence number.
	 * @return the number how many times this pkt was resend. 
	 */
	public getResendCounter(seqNrToAck: number): number {
		let pkt: UtpPacketDTO | null = this.findPacket(seqNrToAck);
		if (pkt != null) {
			return pkt.resendCounter;
		}
		return 1;
	}

}