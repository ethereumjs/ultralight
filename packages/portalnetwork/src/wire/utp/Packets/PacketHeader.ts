import { Uint16, Uint32, Uint8 } from '../index.js'
import { VERSION } from '../Utils/constants.js'
import { SelectiveAckHeaderExtension } from './Extentions.js'
import {
  HeaderInput,
  ISelectiveAckHeaderInput,
  MicroSeconds,
  PacketHeader,
  PacketType,
} from './PacketTyping.js'

abstract class Header<T extends PacketType> {
  pType: PacketType
  version: Uint8
  extension: Uint8
  connectionId: Uint16
  timestampMicroseconds: MicroSeconds
  timestampDifferenceMicroseconds: MicroSeconds
  wndSize: Uint32
  seqNr: Uint16
  ackNr: Uint16
  length: number
  constructor(options: HeaderInput<T>) {
    this.pType = options.pType
    this.version = options.version ?? VERSION
    this.extension = options.extension ?? 0
    this.connectionId = options.connectionId
    this.timestampMicroseconds = options.timestampMicroseconds
    this.timestampDifferenceMicroseconds = options.timestampDifferenceMicroseconds ?? 0
    this.wndSize = options.wndSize
    this.seqNr = options.seqNr
    this.ackNr = options.ackNr
    this.length = 20
  }

  abstract encode(): Buffer
}
export class BasicPacketHeader<T extends PacketType> extends Header<T> {
  constructor(options: HeaderInput<T>) {
    super(options)
  }
  encode(): Buffer {
    const buffer = Buffer.alloc(this.length)
    const p = Number(this.pType).toString(16)
    const v = this.version.toString(16)
    const pv = p + v
    const typeAndVer = parseInt(pv, 16)
    buffer.writeUInt8(typeAndVer, 0)
    buffer.writeUInt8(this.extension, 1)
    buffer.writeUInt16BE(this.connectionId, 2)
    buffer.writeUint32BE(this.timestampMicroseconds, 4)
    buffer.writeUint32BE(this.timestampDifferenceMicroseconds, 8)
    buffer.writeUInt32BE(this.wndSize, 12)
    buffer.writeUInt16BE(this.seqNr, 16)
    buffer.writeUInt16BE(this.ackNr, 18)
    return buffer
  }
}

export class SelectiveAckHeader extends Header<PacketType.ST_STATE> {
  selectiveAckExtension: SelectiveAckHeaderExtension
  bitmask: Uint8Array
  constructor(options: ISelectiveAckHeaderInput) {
    super(options)
    this.extension = 1
    this.bitmask = options.bitmask
    this.selectiveAckExtension = SelectiveAckHeaderExtension.create(options.bitmask)
    this.length = this.encode().length
  }

  encode(): Buffer {
    console.log('encoding selective ack header')
    const buffer = Buffer.alloc(20 + this.bitmask.length + 2)
    const p = this.pType.toString(16)
    const v = this.version.toString(16)
    const pv = p + v
    const typeAndVer = parseInt(pv, 16)
    buffer.writeUInt8(typeAndVer, 0)
    buffer.writeUInt8(this.extension, 1)
    buffer.writeUInt16BE(this.connectionId, 2)
    buffer.writeUInt32BE(this.timestampMicroseconds, 4)
    buffer.writeUInt32BE(this.timestampDifferenceMicroseconds, 8)
    buffer.writeUInt32BE(this.wndSize, 12)
    buffer.writeUInt16BE(this.seqNr, 16)
    buffer.writeUInt16BE(this.ackNr, 18)
    buffer.writeUInt8(this.selectiveAckExtension.type, 20)
    buffer.writeUInt8(this.selectiveAckExtension.len, 21)
    this.selectiveAckExtension.bitmask.forEach((value, idx) => {
      buffer.writeUInt8(value, 22 + idx)
    })
    return buffer
  }
}

export function createPacketHeader<T extends PacketType>(options: HeaderInput<T>): PacketHeader<T> {
  if (options.extension === 1) {
    const header = new SelectiveAckHeader(options)
    return header
  } else {
    return new BasicPacketHeader<T>(options)
  }
}
