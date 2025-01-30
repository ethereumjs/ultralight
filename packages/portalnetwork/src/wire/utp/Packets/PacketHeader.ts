import { VERSION } from '../Utils/constants.js'
import { SelectiveAckHeaderExtension } from './Extensions.js'

import type { Uint16, Uint32, Uint8 } from '../index.js'
import type {
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

  abstract encode(): Uint8Array
}
export class BasicPacketHeader<T extends PacketType> extends Header<T> {
  constructor(options: HeaderInput<T>) {
    super(options)
  }
  encode(): Uint8Array {
    const array = new Uint8Array(this.length)
    const view = new DataView(array.buffer)
    
    // Combine packet type and version into a single byte
    const p = Number(this.pType).toString(16)
    const v = this.version.toString(16)
    const pv = p + v
    const typeAndVer = parseInt(pv, 16)
    
    view.setUint8(0, typeAndVer)
    view.setUint8(1, this.extension)
    view.setUint16(2, this.connectionId, false) // false = big-endian
    view.setUint32(4, this.timestampMicroseconds, false)
    view.setUint32(8, this.timestampDifferenceMicroseconds, false)
    view.setUint32(12, this.wndSize, false)
    view.setUint16(16, this.seqNr, false)
    view.setUint16(18, this.ackNr, false)
    
    return array
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

  encode(): Uint8Array {
    const array = new Uint8Array(20 + this.selectiveAckExtension.bitmask.length + 2)
    const view = new DataView(array.buffer)
    
    // Combine packet type and version into a single byte
    const p = this.pType.toString(16)
    const v = this.version.toString(16)
    const pv = p + v
    const typeAndVer = parseInt(pv, 16)
    
    view.setUint8(0, typeAndVer)
    view.setUint8(1, this.extension)
    view.setUint16(2, this.connectionId, false) // false = big-endian
    view.setUint32(4, this.timestampMicroseconds, false)
    view.setUint32(8, this.timestampDifferenceMicroseconds, false)
    view.setUint32(12, this.wndSize, false)
    view.setUint16(16, this.seqNr, false)
    view.setUint16(18, this.ackNr, false)
    view.setUint8(20, this.selectiveAckExtension.type)
    view.setUint8(21, this.selectiveAckExtension.len)
    
    // Write bitmask values directly to the Uint8Array
    this.selectiveAckExtension.bitmask.forEach((value, idx) => {
      array[22 + idx] = value
    })
    
    return array
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
