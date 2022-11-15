import { Uint16, Uint32, Uint8 } from '../index.js'
import { BigNumber } from 'ethers'
import { VERSION } from '../Utils/constants.js'
import { SelectiveAckHeaderExtension } from './Extentions.js'
import { IPacketHeader, MicroSeconds, PacketType } from './PacketTyping.js'
export class PacketHeader {
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

  constructor(options: IPacketHeader) {
    this.pType = options.pType
    this.version = options.version ?? VERSION
    this.extension = options.extension ?? 0
    this.connectionId = options.connectionId
    this.timestampMicroseconds = options.timestampMicroseconds
    this.timestampDifferenceMicroseconds =
      options.timestampDifferenceMicroseconds ?? BigNumber.from(0)
    this.wndSize = options.wndSize
    this.seqNr = options.seqNr
    this.ackNr = options.ackNr
    this.length = 20
  }
}

export class SelectiveAckHeader extends PacketHeader {
  selectiveAckExtension: SelectiveAckHeaderExtension
  constructor(options: IPacketHeader, bitmask: Uint8Array) {
    super(options)
    this.extension = 1
    this.selectiveAckExtension = SelectiveAckHeaderExtension.create(bitmask)
    this.length = this.encodeHeaderStream().length
  }

  encodeHeaderStream(): Buffer {
    const buffer = Buffer.alloc(20 + this.selectiveAckExtension.len + 2)
    buffer[0] = 1
    buffer[1] = 0
    buffer.writeUInt16BE(this.connectionId, 2)
    buffer.write(this.timestampMicroseconds.toHexString().slice(2), 4, 4, 'hex')
    buffer.write(this.timestampDifferenceMicroseconds.toHexString().slice(2), 8, 4, 'hex')
    buffer.writeUInt32BE(this.wndSize.toNumber(), 12)
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
