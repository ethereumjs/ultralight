import { DEFAULT_WINDOW_SIZE } from '../Utils/constants.js'
import { Packet } from './Packet.js'
import { PacketHeader, SelectiveAckHeader } from './PacketHeader.js'
import { PacketType, Uint16, Uint32, protocolVersion } from './PacketTyping.js'

export type createSynOpts = {
  sndConnectionId: Uint16
  seqNr: Uint16
  ackNr?: number
  timestamp?: number
  rtt_var?: number
  wndSide?: number
}

export type createAckOpts = {
  sndConnectionId: Uint16
  seqNr: Uint16
  ackNr: Uint16
  rtt_var?: number
  wndSize?: number
  timestamp?: number
}
export type createSelectiveAckOpts = {
  sndConnectionId: Uint16
  seqNr: Uint16
  ackNr: Uint16
  rtt_var?: number
  wndSize?: number
  ackNrs: number[]
  timestamp?: number
}
export type createDataOpts = {
  sndConnectionId: Uint16
  seqNr: Uint16
  ackNr: Uint16
  wndSize?: Uint32
  rtt_var?: number
  timestamp?: number
  payload: Uint8Array
}
export type createResetOpts = {
  sndConnectionId: Uint16
  seqNr: Uint16
  ackNr: Uint16
  rtt_var?: number
  timestamp?: number
}
export type createFinOpts = {
  sndConnectionId: Uint16
  seqNr: number
  ackNr: number
  rtt_var?: number
  wndSize?: number
  timestamp?: number
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
    connectionId: opts.sndConnectionId,
    seqNr: opts.seqNr,
    ackNr: opts.ackNr ?? 0,
    timestamp: opts.timestamp,
  })
  const packet: Packet = new Packet({ header: h, payload: new Uint8Array() })
  return packet
}

export function createAckPacket(opts: createAckOpts): Packet {
  const h: PacketHeader = new PacketHeader({
    pType: PacketType.ST_STATE,
    connectionId: opts.sndConnectionId,
    seqNr: opts.seqNr,
    ackNr: opts.ackNr,
    wndSize: opts.wndSize,
    timestamp: opts.timestamp,
    timestampDiff: opts.rtt_var,
  })

  const packet: Packet = new Packet({ header: h, payload: new Uint8Array(0) })
  return packet
}
export function createSelectiveAckPacket(opts: createSelectiveAckOpts): Packet {
  const h: SelectiveAckHeader = new SelectiveAckHeader(
    {
      pType: PacketType.ST_STATE,
      connectionId: opts.sndConnectionId,
      seqNr: opts.seqNr,
      ackNr: opts.ackNr,
      wndSize: opts.wndSize,
      timestampDiff: opts.rtt_var,
      timestamp: opts.timestamp,
    },
    Uint8Array.from(opts.ackNrs)
  )

  const packet: Packet = new Packet({ header: h, payload: new Uint8Array(0) })
  return packet
}

export function createDataPacket(opts: createDataOpts): Packet {
  const h: PacketHeader = new PacketHeader({
    pType: PacketType.ST_DATA,
    version: protocolVersion,
    extension: 0,
    connectionId: opts.sndConnectionId,
    timestampDiff: opts.rtt_var,
    wndSize: opts.wndSize ?? DEFAULT_WINDOW_SIZE,
    seqNr: opts.seqNr,
    ackNr: opts.ackNr,
    timestamp: opts.timestamp,
  })
  const packet: Packet = new Packet({ header: h, payload: opts.payload })
  return packet
}
export function createResetPacket(opts: createResetOpts): Packet {
  const h = new PacketHeader({
    pType: PacketType.ST_RESET,
    version: protocolVersion,
    extension: 0,
    connectionId: opts.sndConnectionId,
    timestamp: opts.timestamp,
    timestampDiff: 0,
    wndSize: 0,
    seqNr: opts.seqNr,
    ackNr: opts.ackNr,
  })
  return new Packet({ header: h, payload: new Uint8Array() })
}
export function createFinPacket(opts: createFinOpts): Packet {
  const h = new PacketHeader({
    pType: PacketType.ST_FIN,
    version: protocolVersion,
    extension: 0,
    connectionId: opts.sndConnectionId,
    timestamp: opts.timestamp,
    timestampDiff: 0,
    wndSize: opts.wndSize,
    seqNr: opts.seqNr,
    ackNr: opts.ackNr,
  })
  return new Packet({ header: h, payload: new Uint8Array() })
}
