import { PacketType, IPacketOptions } from './PacketTyping.js'
import { PacketHeader } from './PacketHeader.js'
import { SelectiveAckHeader } from './index.js'
import {
  createAckOpts,
  createAckPacket,
  createDataOpts,
  createDataPacket,
  createFinOpts,
  createFinPacket,
  createPacketOpts,
  createResetOpts,
  createResetPacket,
  createSelectiveAckOpts,
  createSelectiveAckPacket,
  createSynOpts,
  createSynPacket,
} from './create.js'

export class Packet {
  header: PacketHeader | SelectiveAckHeader
  payload: Uint8Array
  sent: number
  // size: number
  extensions: any[]

  public static bufferToPacket(buffer: Buffer): Packet {
    const ptandver = buffer[0].toString(16)
    const ver = ptandver[1]
    const _version = parseInt(ver, 16)
    const extension = buffer.readUInt8(1)
    let packet: Packet
    if (extension === 1) {
      const size = buffer.readUInt8(21)
      packet = new Packet({
        header: new SelectiveAckHeader(
          {
            pType: buffer[0] >> 4,
            version: 1,
            extension: buffer.readUInt8(1),
            connectionId: buffer.readUInt16BE(2),
            timestampMicroseconds: buffer.readUInt32BE(4),
            timestampDifferenceMicroseconds: buffer.readUInt32BE(8),
            wndSize: buffer.readUInt32BE(12),
            seqNr: buffer.readUInt16BE(16),
            ackNr: buffer.readUInt16BE(18),
          },
          buffer.subarray(22, 22 + size)
        ),
        payload: buffer.subarray(22 + size),
      })
      return packet
    } else {
      const packet = new Packet({
        header: new PacketHeader({
          pType: buffer[0] >> 4,
          version: 1,
          extension: 0,
          connectionId: buffer.readUInt16BE(2),
          timestampMicroseconds: buffer.readUInt32BE(4),
          timestampDifferenceMicroseconds: buffer.readUInt32BE(8),
          wndSize: buffer.readUInt32BE(12),
          seqNr: buffer.readUInt16BE(16),
          ackNr: buffer.readUInt16BE(18),
        }),
        payload: buffer.subarray(20),
      })
      return packet
    }
  }

  public static create = (
    type: PacketType,
    opts: createPacketOpts,
    selectiveAck?: boolean
  ): Packet => {
    let packet: Packet
    switch (type) {
      case PacketType.ST_SYN:
        packet = createSynPacket(opts as createSynOpts)
        break
      case PacketType.ST_STATE:
        if (selectiveAck === true) {
          packet = createSelectiveAckPacket(opts as createSelectiveAckOpts)
        } else {
          packet = createAckPacket(opts as createAckOpts)
        }
        break
      case PacketType.ST_DATA:
        packet = createDataPacket(opts as createDataOpts)
        break
      case PacketType.ST_FIN:
        packet = createFinPacket(opts as createFinOpts)
        break
      case PacketType.ST_RESET:
        packet = createResetPacket(opts as createResetOpts)
        break
      default:
        throw new Error('Not a valid packet type')
    }
    return packet
  }

  constructor(options: IPacketOptions) {
    this.header = options.header
    this.payload = options.payload
    this.sent = 0
    // this.size = this.header.length + this.payload.length
    this.extensions = []
  }

  encode(): Buffer {
    const buffer = Buffer.alloc(this.header.length)
    const p = this.header.pType.toString(16)
    const v = this.header.version.toString(16)
    const pv = p + v
    const typeAndVer = parseInt(pv, 16)

    buffer.writeUInt8(typeAndVer, 0)
    buffer.writeUInt8(this.header.extension, 1)
    buffer.writeUInt16BE(this.header.connectionId, 2)
    buffer.writeUInt32BE(this.header.timestampMicroseconds, 4)
    buffer.writeUInt32BE(this.header.timestampDifferenceMicroseconds, 8)
    buffer.writeUInt32BE(this.header.wndSize, 12)
    buffer.writeUInt16BE(this.header.seqNr, 16)
    buffer.writeUInt16BE(this.header.ackNr, 18)
    if (this.header.extension === 1) {
      const p = this.header as SelectiveAckHeader
      buffer.writeUInt8(p.selectiveAckExtension.type, 20)
      buffer.writeUInt8(p.selectiveAckExtension.len, 21)
      p.selectiveAckExtension.bitmask.forEach((uint8, idx) => {
        buffer.writeUInt8(uint8, 22 + idx)
      })
    }
    if (this.payload) {
      return Buffer.concat([buffer, Buffer.from(this.payload)])
    }
    return buffer
  }
}

export * from './PacketTyping.js'
