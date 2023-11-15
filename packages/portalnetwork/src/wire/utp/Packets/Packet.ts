import { createPacketHeader } from './index.js'

import type {
  PacketHeader,
  PacketInput,
  PacketOptions,
  PacketType,
  SelectiveAckHeader,
} from './index.js'

export class Packet<T extends PacketType> {
  public readonly header: PacketHeader<T> | SelectiveAckHeader
  public readonly payload?: Uint8Array
  public readonly _size: number

  public static fromBuffer(buffer: Buffer): Packet<PacketType> {
    const extension = buffer.readUInt8(1)
    const metaData = {
      pType: buffer[0] >> 4,
      extension: buffer.readUInt8(1),
      connectionId: buffer.readUInt16BE(2),
      timestampMicroseconds: buffer.readUint32BE(4),
      timestampDifferenceMicroseconds: buffer.readUint32BE(8),
      wndSize: buffer.readUInt32BE(12),
      seqNr: buffer.readUInt16BE(16),
      ackNr: buffer.readUInt16BE(18),
    }
    let packet: Packet<any>
    if (extension === 1) {
      const size = buffer.readUInt8(21)
      const bitmask = buffer.subarray(22, 22 + size)
      packet = Packet.fromOpts({
        header: {
          version: 1,
          ...metaData,
          bitmask: Uint8Array.from(bitmask),
        },
      })
      return packet
    } else {
      const packet = Packet.fromOpts({
        header: {
          version: 1,
          ...metaData,
        },
        payload: buffer.subarray(20),
      })
      return packet
    }
  }
  public static fromOpts<T extends PacketType>(opts: PacketOptions<T>): Packet<T> {
    const packet = new Packet<T>({ header: opts.header, payload: opts.payload })
    return packet
  }
  constructor(options: PacketInput<T>) {
    this.header = createPacketHeader(options.header)
    this.payload = options.payload ?? Uint8Array.from([])
    this._size = this.header.length + this.payload.length
  }
  public get size() {
    return this._size
  }
  public encode(): Buffer {
    const buffer = this.header.encode()
    if (this.payload) {
      return Buffer.concat([buffer, Buffer.from(this.payload)])
    }
    return buffer
  }
}

export * from './PacketTyping.js'
