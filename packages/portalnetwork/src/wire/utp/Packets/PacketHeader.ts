import { Bytes32TimeStamp, Uint16, Uint32, Uint8 } from '../index.js'
import { VERSION, DEFAULT_WINDOW_SIZE } from '../Utils/constants.js'
import { SelectiveAckHeaderExtension } from './Extentions.js'
import { IPacketHeader, MicroSeconds, PacketType } from './PacketTyping.js'
export class PacketHeader {
  pType: PacketType
  version: Uint8
  extension: Uint8
  connectionId: Uint16
  timestamp: MicroSeconds
  timestampDiff: MicroSeconds
  wndSize: Uint32
  seqNr: Uint16
  ackNr: Uint16
  length: number

  constructor(options: IPacketHeader) {
    this.pType = options.pType
    this.version = options.version ?? VERSION
    this.extension = options.extension ?? 0
    this.connectionId = options.connectionId
    this.timestamp = options.timestamp ?? Bytes32TimeStamp()
    this.timestampDiff = options.timestampDiff ?? 0
    this.wndSize = options.wndSize ?? DEFAULT_WINDOW_SIZE
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
    this.selectiveAckExtension = new SelectiveAckHeaderExtension(bitmask)
    this.length = this.encodeHeaderStream().length
  }

  encodeHeaderStream(): Buffer {
    const buffer = Buffer.alloc(20 + this.selectiveAckExtension.len + 2)
    buffer[0] = 1
    buffer[1] = 0
    buffer.writeUInt16BE(this.connectionId, 2)
    buffer.writeUInt32BE(this.timestamp, 4)
    buffer.writeUInt32BE(this.timestampDiff as number, 8)
    buffer.writeUInt32BE(this.wndSize as number, 12)
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
