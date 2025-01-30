import { createPacketHeader } from './index.js'
import { concatBytes } from '@ethereumjs/util'
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

  public static fromBuffer(buffer: Uint8Array): Packet<PacketType> {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    
    const metaData = {
      pType: buffer[0] >> 4,
      extension: view.getUint8(1),
      connectionId: view.getUint16(2, false), // false = big-endian
      timestampMicroseconds: view.getUint32(4, false),
      timestampDifferenceMicroseconds: view.getUint32(8, false),
      wndSize: view.getUint32(12, false),
      seqNr: view.getUint16(16, false),
      ackNr: view.getUint16(18, false),
    }

    if (metaData.extension === 1) {
      const size = view.getUint8(21)
      const bitmask = buffer.slice(22, 22 + size)
      const packet = Packet.fromOpts({
        header: {
          version: 1,
          ...metaData,
          bitmask,
        },
      })
      return packet
    } else {
      const packet = Packet.fromOpts({
        header: {
          version: 1,
          ...metaData,
        },
        payload: buffer.slice(20),
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
  public encode(): Uint8Array {
    const buffer = this.header.encode()
    if (this.payload) {
      return concatBytes(buffer, (this.payload))
    }
    return buffer
  }
}

export * from './PacketTyping.js'
