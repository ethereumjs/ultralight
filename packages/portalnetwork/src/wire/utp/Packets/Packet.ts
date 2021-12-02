import {
  protocolVersion,
  PacketType,
  IPacketOptions,
  DEFAULT_WINDOW_SIZE,
} from "./PacketTyping";
import { PacketHeader } from "./PacketHeader";
import { Uint16, Uint32 } from ".";
import { packetToBuffer } from "..";
import { debug } from "debug";

const log = debug("<uTP>")


export class Packet {
  header: PacketHeader;
  payload: Uint8Array;
  sent: number;
  size: number;
  constructor(options: IPacketOptions) {
    this.header = options.header;
    this.payload = options.payload;
    this.sent = 0;
    this.size = 20 + this.payload.length;
  }

  encodePacket(): Buffer {
    let buffer = packetToBuffer(this)
    return buffer
  }
}

export function createSynPacket(
  rcvConnectionId: Uint16,
  seqNr: Uint16,
  ackNr?: number
): Packet {
  let h: PacketHeader = new PacketHeader({
    pType: PacketType.ST_SYN,
    connectionId: rcvConnectionId,
    seqNr: seqNr,
    ackNr: ackNr || 0,
  });
  log("Creating ST_SYN Packet...")
  let packet: Packet = new Packet({ header: h, payload: new Uint8Array() });
  return packet;
}

export function createAckPacket(
  seqNr: Uint16,
  sndConnectionId: Uint16,
  ackNr: Uint16,
  rtt_var: number
  ): Packet {
    let h: PacketHeader = new PacketHeader({
      pType: PacketType.ST_STATE,
      connectionId: sndConnectionId,
      seqNr: seqNr,
      ackNr: ackNr,
      wndSize: DEFAULT_WINDOW_SIZE,
      timestampDiff: rtt_var
    });
    
    log("Creating ST_STATE Packet...")
    const packet: Packet = new Packet({ header: h, payload: new Uint8Array(0) });
    return packet;
  }
  
  export function createDataPacket(
    seqNr: Uint16,
    sndConnectionId: Uint16,
    ackNr: Uint16,
    bufferSize: Uint32,
    payload: Uint8Array,
    rtt_var: number
    ): Packet {
      let h: PacketHeader = new PacketHeader({
        pType: PacketType.ST_DATA,
        version: protocolVersion,
        extension: 0,
        connectionId: sndConnectionId,
        timestampDiff: rtt_var,
        wndSize: bufferSize,
        seqNr: seqNr,
        ackNr: ackNr,
      });
      const packet: Packet = new Packet({ header: h, payload: payload });
      log("Creating ST_DATA Packet...")
      return packet;
    }
    
    export function createResetPacket(
      seqNr: Uint16,
      sndConnectionId: Uint16,
      ackNr: Uint16,
      ): Packet {
        let h = new PacketHeader({
          pType: PacketType.ST_RESET,
          version: protocolVersion,
          extension: 0,
          connectionId: sndConnectionId,
          timestamp: Date.now(),
          timestampDiff: 0,
          wndSize: 0,
          seqNr: seqNr,
          ackNr: ackNr,
        });
        log("Creating ST_RESET Packet...")
        return new Packet({ header: h, payload: new Uint8Array() });
      }
      
      export function createFinPacket(
        connectionId: Uint16,
        ackNr: number,
        ): Packet {
          let h = new PacketHeader({
            pType: PacketType.ST_FIN,
            version: protocolVersion,
            extension: 0,
            connectionId: connectionId,
            timestamp: Date.now(),
            timestampDiff: 0,
            wndSize: DEFAULT_WINDOW_SIZE,
            seqNr: Number("eof_pkt") as Uint16,
            ackNr: ackNr
          })
          log("Creating ST_FIN Packet...")
          return new Packet({header: h, payload: new Uint8Array()})
        }
        
        


export * from "./PacketTyping";
