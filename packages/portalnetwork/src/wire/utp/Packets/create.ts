import { DEFAULT_WINDOW_SIZE } from '../Utils/constants.js'
import { Packet } from './Packet.js'
import { PacketHeader, SelectiveAckHeader } from './PacketHeader.js'
import { PacketType, Uint16, Uint32, protocolVersion, Uint8 } from './PacketTyping.js'

export type createSynOpts = {
  version: Uint8
  connectionId: Uint16
  seqNr: Uint16
  ackNr: number
  timestampMicrosecondsMicroseconds?: number
  wndSize: number
  timestampMicroseconds?: number
  timestampDifferenceMicroseconds?: number
}

export type createAckOpts = {
  version?: Uint8
  extension?: Uint8
  connectionId: Uint16
  seqNr: Uint16
  ackNr: Uint16
  wndSize: number
  timestampMicroseconds?: number
  timestampDifferenceMicroseconds?: number
}
export type createSelectiveAckOpts = {
  header: {
    extension?: Uint8
    version?: Uint8
    connectionId: Uint16
    seqNr: Uint16
    ackNr: Uint16
    wndSize: number
    timestampDifferenceMicroseconds?: number
    timestampMicroseconds?: number
  }
  bitmask: Uint8Array
}
export type createDataOpts = {
  extension?: Uint8
  version?: Uint8
  connectionId: Uint16
  seqNr: Uint16
  ackNr: Uint16
  wndSize: Uint32
  timestampMicroseconds?: number
  timestampDifferenceMicroseconds?: number
  payload: Uint8Array
}
export type createResetOpts = {
  extension?: Uint8
  version?: Uint8
  connectionId: Uint16
  seqNr: Uint16
  ackNr: Uint16
  wndSize: Uint32
  timestampMicroseconds?: number
  timestampDifferenceMicroseconds?: number
}
export type createFinOpts = {
  extension?: Uint8
  version?: Uint8
  connectionId: Uint16
  seqNr: number
  ackNr: number
  wndSize: number
  timestampMicroseconds?: number
  timestampDifferenceMicroseconds?: number
}

export type createPacketOpts =
  | createSynOpts
  | createAckOpts
  | createSelectiveAckOpts
  | createDataOpts
  | createResetOpts
  | createFinOpts

export function createSynPacket(opts: createSynOpts): Packet {
  const h: PacketHeader = new PacketHeader({
    pType: PacketType.ST_SYN,
    ...opts,
  })
  const packet: Packet = new Packet({ header: h, payload: new Uint8Array() })
  return packet
}

export function createAckPacket(opts: createAckOpts): Packet {
  const h: PacketHeader = new PacketHeader({
    pType: PacketType.ST_STATE,
    ...opts,
  })

  const packet: Packet = new Packet({ header: h, payload: new Uint8Array([]) })
  return packet
}
export function createSelectiveAckPacket(opts: createSelectiveAckOpts): Packet {
  const h: SelectiveAckHeader = new SelectiveAckHeader(
    {
      pType: PacketType.ST_STATE,
      ...opts.header,
    },
    opts.bitmask
  )

  const packet: Packet = new Packet({ header: h, payload: new Uint8Array([]) })
  return packet
}

export function createDataPacket(opts: createDataOpts): Packet {
  const h: PacketHeader = new PacketHeader({
    pType: PacketType.ST_DATA,
    ...opts,
  })
  const packet: Packet = new Packet({ header: h, payload: opts.payload })
  return packet
}
export function createResetPacket(opts: createResetOpts): Packet {
  const h = new PacketHeader({
    pType: PacketType.ST_RESET,
    ...opts,
  })
  return new Packet({ header: h, payload: new Uint8Array() })
}
export function createFinPacket(opts: createFinOpts): Packet {
  const h = new PacketHeader({
    pType: PacketType.ST_FIN,
    ...opts,
  })
  return new Packet({ header: h, payload: new Uint8Array() })
}
