import { Multiaddr } from '@multiformats/multiaddr'
import { PacketHeader } from './PacketHeader.js'

export const minimalHeaderSize = 20
export const protocolVersion = 1

export enum PacketType {
  ST_DATA = 0,
  ST_FIN = 1,
  ST_STATE = 2,
  ST_RESET = 3,
  ST_SYN = 4,
}

export enum AckType {
  DATA_ACK = 0,
  SELECTIVE_ACK = 1,
}

export const CLOSE_GRACE = 5000

export const BUFFER_SIZE = 512

export type Uint8 = number
export type Uint16 = number
export type Uint32 = number
export type MicroSeconds = Uint32

export interface connectionType {
  Id: Multiaddr
  seqNr: Uint16
  ackNr: Uint16
}

export type PacketHeaderType = {
  pType: PacketType
  version: Uint8
  extension: Uint8
  connectionId: Uint16
  timestampMicroseconds: MicroSeconds
  timestampDifferenceMicroseconds: MicroSeconds
  wndSize: Uint32
  seqNr: Uint16
  ackNr: Uint16
  extentions?: Uint8Array
}

export interface IPacketHeader {
  pType: PacketType
  connectionId: Uint16
  seqNr: Uint16
  ackNr: Uint16
  version?: Uint8
  extension?: Uint8
  timestampMicroseconds?: MicroSeconds
  timestampDifferenceMicroseconds?: MicroSeconds
  wndSize: Uint32
  extensions?: Uint8Array
}

export interface IPacketOptions {
  header: PacketHeader
  payload: Uint8Array
}

export interface IPacketCreateOptions {
  header: IPacketCreateOptions
  payload?: Uint8Array
}

export interface IPacketHeaderOptions {
  pType: PacketType
  version: Uint8
  extension: Uint8
  connectionId: Uint16
  timestampMicroseconds?: MicroSeconds
  timestampDifferenceMicroseconds?: MicroSeconds
  wndSize?: Uint32
  seqNr?: Uint16
  ackNr?: Uint16
  extentions?: Uint8Array
}
