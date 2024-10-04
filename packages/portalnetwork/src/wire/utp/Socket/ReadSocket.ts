import { UtpSocketType } from '../Packets/index.js'

import { ContentReader } from './ContentReader.js'
import { UtpSocket } from './UtpSocket.js'
import { ConnectionState } from './socketTyping.js'

import type { Packet, PacketType, UtpSocketOptions } from '../Packets/index.js'

export class ReadSocket extends UtpSocket {
  type: UtpSocketType.READ
  reader: ContentReader | undefined
  constructor(options: UtpSocketOptions) {
    super(options)
    this.type = UtpSocketType.READ
  }
  setReader(startingSeqNr: number) {
    this.reader = new ContentReader(startingSeqNr, this.logger)
  }
  async handleSynPacket(seqNr: number): Promise<void> {
    this.setState(ConnectionState.SynRecv)
    this.logger(`Connection State: SynRecv`)
    this.setAckNr(seqNr)
    // This initiates an OFFER.
    // The first DATA packet will have seqNr + 1
    this.setReader(seqNr + 1)
    await this.sendSynAckPacket()
  }
  async handleStatePacket(ackNr: number): Promise<void> {
    if (ackNr === this.finNr) {
      await this.handleFinAck()
    }
  }
  async handleDataPacket(packet: Packet<PacketType.ST_DATA>): Promise<void | Uint8Array> {
    this._clearTimeout()
    if (this.state !== ConnectionState.GotFin) {
      this.state = ConnectionState.Connected
    } else {
      this.logger(`Connection State: GotFin: ${this.finNr}`)
    }
    let expected = true
    if (this.ackNrs.length > 1) {
      expected = this.ackNr + 1 === packet.header.seqNr
    }
    this.setSeqNr(this.getSeqNr() + 1)
    if (!this.reader) {
      this.reader = new ContentReader(packet.header.seqNr)
      this.reader.bytesExpected = Infinity
    }
    // Add the packet.seqNr to this.ackNrs at the relative index, regardless of order received.
    if (this.ackNrs[0] === undefined) {
      this.logger(`Setting AckNr[0] to ${packet.header.seqNr}`)
      this.ackNrs[0] = packet.header.seqNr
    } else {
      this.logger(
        `Setting AckNr[${packet.header.seqNr - this.ackNrs[0]}] to ${packet.header.seqNr}`,
      )
      this.ackNrs[packet.header.seqNr - this.ackNrs[0]] = packet.header.seqNr
    }
    this.reader.addPacket(packet)
    this.logger(
      `Packet bytes: ${packet.payload!.length} bytes.  Total bytes: ${
        this.reader.bytesReceived
      } bytes.`,
    )
    if (expected) {
      // Update this.ackNr to last in-order seqNr received.
      const future = this.ackNrs.slice(packet.header.seqNr - this.ackNrs[0]!)
      this.ackNr = future.slice(future.findIndex((n, i, ackNrs) => ackNrs[i + 1] === undefined))[0]!
      if (this.state === ConnectionState.GotFin) {
        if (this.ackNr === this.finNr) {
          this.logger(`All data packets received. Running compiler.`)
          await this.sendAckPacket()
          return this.close(true)
        }
      }
      // Send "Regular" ACK with the new this.ackNr
      return this.sendAckPacket()
    } else {
      // Do not increment this.ackNr
      // Send SELECTIVE_ACK with bitmask of received seqNrs > this.ackNr
      this.logger(`Packet has arrived out of order.  Replying with SELECTIVE ACK.`)
      const bitmask = this.generateSelectiveAckBitMask()
      return this.sendAckPacket(bitmask)
    }
  }
  async handleFinPacket(
    packet: Packet<PacketType.ST_FIN>,
    compile?: boolean,
  ): Promise<Uint8Array | undefined> {
    this.state = ConnectionState.GotFin
    this.finNr = packet.header.seqNr
    this.reader!.lastDataNr = this.finNr - 1
    this.logger.extend('FIN')(`Connection State: GotFin: ${this.finNr}`)
    const expected = this.ackNr + 1 === packet.header.seqNr
    if (expected) {
      this.logger.extend('FIN')(
        `all data packets received.  ${this.reader?.bytesReceived} bytes received.`,
      )
      this.seqNr = this.seqNr + 1
      this.ackNr = packet.header.seqNr
      void this.sendAckPacket()
      return this.close(compile)
    } else {
      this.logger.extend('FIN')(`Expected: ${this.ackNr + 1} got ${packet.header.seqNr}`)
      // Else wait for all data packets.
      // TODO: Do we ever ACK the FIN packet?  Does our peer care?
      return
    }
  }
  compile(): Uint8Array {
    const _content = this.reader!.bytes
    this.logger.extend('READING')(`Returning ${_content.length} bytes.`)
    return Uint8Array.from(_content)
  }
  close(compile: boolean = false): Uint8Array | undefined {
    this.logger.extend('CLOSE')(`Closing connection to ${this.remoteAddress}`)
    this.logger.extend('CLOSE')(`compile=${compile}`)
    clearInterval(this.packetManager.congestionControl.timeoutCounter)
    this.packetManager.congestionControl.removeAllListeners()
    this._clearTimeout()
    if (compile === true) {
      this.logger.extend('CLOSE')(`Running compiler.`)
      return this.compile()
    }
  }
}
