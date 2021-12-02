import { Multiaddr } from "multiaddr";
import { PacketHeader } from "./PacketHeader";

export const minimalHeaderSize = 20;
export const protocolVersion = 1;

export enum PacketType {
  ST_DATA = 0,
  ST_FIN = 1,
  ST_STATE = 2,
  ST_RESET = 3,
  ST_SYN = 4,
}

export const MIN_PACKET_SIZE = 20;
export const DEFAULT_WINDOW_SIZE = 1 << 18;
export const CLOSE_GRACE = 5000;

export const BUFFER_SIZE = 512;

export type Uint8 = number;
export type Uint16 = number;
export type Uint32 = number;
export type MicroSeconds = Uint32;

export interface connectionType {
  Id: Multiaddr,
  seqNr: Uint16,
  ackNr: Uint16
}

export type PacketHeaderType = {
  pType: PacketType;
  version: Uint8;
  extension: Uint8;
  connectionId: Uint16;
  timestamp: MicroSeconds;
  timestampDiff: MicroSeconds;
  wndSize: Uint32;
  seqNr: Uint16;
  ackNr: Uint16;
}
export interface IPacketHeader {
  pType: PacketType;
  connectionId: Uint16;
    seqNr: Uint16;
    ackNr: Uint16;
  version?: Uint8;
  extension?: Uint8;
  timestamp?: MicroSeconds;
  timestampDiff?: MicroSeconds;
  wndSize?: Uint32;
}



export interface IPacketOptions {
    header: PacketHeader,
    payload: Uint8Array ,
  }

export interface IDecodePacketOptions extends IPacketOptions {
    bytes: Uint8Array
}