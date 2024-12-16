import debug from 'debug'

import { type DataPacket, parsePrefix } from '../index.js'

import type { Debugger } from 'debug'

export class ContentReader {
  contents: Uint8Array[]
  bytesReceived: number
  bytesExpected: number
  packets: DataPacket[]
  reading: boolean
  startingDataNr: number
  lastDataNr: number
  nextDataNr: number
  logger: Debugger
  bytes: number[]
  length: number
  offset: number
  constructor(startingDataNr: number, logger?: Debugger) {
    this.contents = []
    this.bytesReceived = 0
    this.bytesExpected = -Infinity
    this.length = 0
    this.offset = 0
    this.packets = new Array<DataPacket>()
    this.bytes = []
    this.reading = true
    this.startingDataNr = startingDataNr
    this.nextDataNr = startingDataNr
    this.lastDataNr = Infinity
    this.logger = logger ? logger.extend('READING') : debug('read').extend('READING')
    this.logger(`Starting at ${this.nextDataNr}`)
  }

  addPacket(packet: DataPacket): void {
    this.logger(`packet ${packet.header.seqNr}: +${packet.payload!.length} bytes.`)
    this.packets[packet.header.seqNr] = packet
    this.bytesReceived += packet.payload!.length
    this.logger(`Total ${this.bytesReceived} bytes received`)
    if (packet.header.seqNr === this.nextDataNr!) {
      this._addPacket(packet)
    } else {
      this.logger.extend('OOO')(
        `packet.header.seqNr (${packet.header.seqNr}) !== (${this.nextDataNr}) this.nextDataNr`,
      )
    }
    if (packet.header.seqNr < this.startingDataNr) {
      this.packets[packet.header.seqNr] = packet
      this.startingDataNr = packet.header.seqNr
      this.bytes.unshift(...packet.payload!)
    }
  }

  readPrefix(bytes?: Uint8Array) {
    const [length, offset] = parsePrefix(Uint8Array.from(bytes ?? this.bytes))
    this.length = length
    this.offset = offset
    this.bytesExpected = length + offset
    this.logger(
      `Next content: ${this.bytesExpected} bytes`,
      `offset: ${this.offset} + length: ${this.length}`,
    )
  }

  readPacket(payload: Uint8Array) {
    this.nextDataNr!++
    // Reset to 0 since ackNr and seqNr are 16 bit unsigned integers
    if (this.nextDataNr! > 65535) this.nextDataNr! = 0
    this.bytes.push(...payload)
    this.logger.extend('BYTES')(
      `Current stream: ${this.bytes.length} / ${this.bytesExpected} bytes. ${this.bytesExpected - this.bytes.length} bytes till end of content.`,
    )
  }

  readContent() {
    while (this.bytes.length >= this.bytesExpected) {
      this.logger(`Expected content: ${this.bytesExpected} Bytes.`)
      this.logger(`Currently stored: ${this.bytes.length} Bytes.`)
      const content = this.bytes.slice(this.offset, this.length + this.offset)
      this.logger(`Got Content: ${content.length} Bytes (+ ${this.offset} offset)`)
      this.contents.push(Uint8Array.from(content))
      this.bytes = this.bytes.slice(this.length + this.offset)
      this.logger(`${this.bytes.length} Bytes remaining`)
      if (this.bytes.length > 0) {
        this.readPrefix()
      }
    }
  }

  _addPacket(packet: DataPacket): void {
    this.packets[packet.header.seqNr] = packet
    if (this.bytesExpected === -Infinity) {
      const bytes = packet.payload!
      this.readPrefix(bytes)
    }
    this.readPacket(packet.payload!)
    this.readContent()
    while (this.packets[this.nextDataNr!] !== undefined) {
      const nextPacket = this.packets[this.nextDataNr!]
      this.logger(`packet:${this.nextDataNr} +${nextPacket.payload!.length} bytes.`)
      this.readPacket(nextPacket.payload!)
      this.readContent()
    }
  }
}
