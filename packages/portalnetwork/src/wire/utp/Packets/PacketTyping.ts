import { Debugger } from 'debug'
import { ProtocolId } from '../../../subprotocols/types.js'
import { Packet } from './index.js'
import { BasicPacketHeader, SelectiveAckHeader } from './PacketHeader.js'

export const BUFFER_SIZE = 512
export enum PacketType {
  ST_DATA = 0,
  ST_FIN = 1,
  ST_STATE = 2,
  ST_RESET = 3,
  ST_SYN = 4,
}
export type SynPacket = Packet<PacketType.ST_SYN>
export type StatePacket = Packet<PacketType.ST_STATE>
export type ResetPacket = Packet<PacketType.ST_RESET>
export type FinPacket = Packet<PacketType.ST_FIN>
export type DataPacket = Packet<PacketType.ST_DATA>
export enum UtpSocketType {
  READ = 'read',
  WRITE = 'write',
}
export enum HeaderExtension {
  none = 0,
  selectiveAck = 1,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface IHeaderInput<T extends PacketType> {
  pType: PacketType
  version: Uint8
  connectionId: Uint16
  timestampMicroseconds: MicroSeconds
  timestampDifferenceMicroseconds: MicroSeconds
  wndSize: Uint32
  seqNr: Uint16
  ackNr: Uint16
}
interface IBasicHeaderInput<T extends PacketType> extends IHeaderInput<T> {
  pType: PacketType
  extension: HeaderExtension.none
}
export interface ISelectiveAckHeaderInput extends IHeaderInput<PacketType.ST_STATE> {
  pType: PacketType.ST_STATE
  extension: HeaderExtension.selectiveAck
  bitmask: Uint8Array
}
export type HeaderInput<T extends PacketType> = IBasicHeaderInput<T> | ISelectiveAckHeaderInput

interface IBasicPacketOptions<T extends PacketType> {
  header: HeaderInput<T>
  payload?: Uint8Array
}
interface IDataPacketOptions extends IBasicPacketOptions<PacketType.ST_DATA> {
  header: HeaderInput<PacketType.ST_DATA>
  payload: Uint8Array
}
export type PacketOptions<T extends PacketType> = IBasicPacketOptions<T> | IDataPacketOptions

interface IPacketInput<T extends PacketType> {
  header: HeaderInput<T>
}
interface BasicPacketInput<T extends PacketType> extends IPacketInput<T> {
  payload?: Uint8Array
}
interface DataPacketInput extends IPacketInput<PacketType.ST_DATA> {
  payload: Uint8Array
}
export type PacketInput<T extends PacketType> = BasicPacketInput<T> | DataPacketInput

export type PacketHeader<T extends PacketType> = BasicPacketHeader<T> | SelectiveAckHeader
export interface IPacket<T extends PacketType> {
  pType: T
  seqNr: number
  ackNr: number
  payload?: Uint8Array
}
export interface IBasic<T extends PacketType> extends IPacket<T> {
  pType: T
  extension: HeaderExtension.none
}
export interface ISelectiveAck extends IPacket<PacketType.ST_STATE> {
  pType: PacketType.ST_STATE
  extension: HeaderExtension.selectiveAck
  bitmask: Uint8Array
}
export interface IData extends IPacket<PacketType.ST_DATA> {
  pType: PacketType.ST_DATA
  extension: HeaderExtension.none
  payload: Uint8Array
}
export type ICreate<T extends PacketType> = IBasic<T> | ISelectiveAck | IData

export interface UtpSocketOptions<P extends ProtocolId> {
  protocolId: P
  remoteAddress: string
  sndId: number
  rcvId: number
  seqNr: number
  ackNr: number
  type: UtpSocketType
  logger: Debugger
  content?: Uint8Array
}

interface ICreatePacket<T> {
  pType: T
}
interface ICreateSelectiveAck extends ICreatePacket<PacketType.ST_STATE> {
  bitmask: Uint8Array
}
export interface ICreateData extends ICreatePacket<PacketType.ST_DATA> {
  payload: Uint8Array
}
export type ICreatePacketOpts<T> = ICreatePacket<T> | ICreateData | ICreateSelectiveAck

export type Uint8 = number
export type Uint16 = number
export type Uint32 = number
export type MicroSeconds = Uint32
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
  extensions?: Uint8Array
}
