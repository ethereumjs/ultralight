import { Uint16, Uint32 } from "..";
import { hrtime } from "process";
import { EXTENSION, ID_MASK, VERSION } from "./constants";
import { PacketHeader } from "../Packets/PacketHeader";
import { Packet } from "../Packets/Packet";
import { Duration, Miliseconds } from "../Socket/socketTyping";
import { minimalHeaderSize } from "../Packets/PacketTyping";
import * as Convert from './Convert';


export function getMonoTimeStamp(): Uint32 {
    let time = hrtime.bigint();
    return Number(time / BigInt(1000)) as Uint32;
  }
  
  export function randUint16(): Uint16 {
    return (Math.random() * 2 ** 16) as Uint16;
  }
  export function randUint32(): Uint16 {
    return (Math.random() * 2 ** 32) as Uint16;
  }

  export function bitLength(n: number): number {
    const bitstring = n.toString(2);
    if (bitstring === "0") {
      return 0;
    }
    return bitstring.length;
  }
  
  export function nextPowerOf2(n: number): number {
    return n <= 0 ? 1 : Math.pow(2, bitLength(n - 1));
  }

  export function sleep(ms: Miliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  export function max(a: number, b: Duration): Duration {
    return a > b ? a : b;
  }


  export function bufferToPacket(buffer: Buffer): Packet {
    let ptandver = buffer[0].toString(16);
    let ver = ptandver[1];
    let version = parseInt(ver,16);


    let packet: Packet = new Packet({
      header: new PacketHeader({
        pType: buffer[0] >> 4,
        version: version,
        extension: buffer.readUInt8(1),
        connectionId: buffer.readUInt16BE(2),
        timestamp: buffer.readUInt32BE(4),
        timestampDiff: buffer.readUInt32BE(8),
        wndSize: buffer.readUInt32BE(12),
        seqNr: buffer.readUInt16BE(16),
        ackNr: buffer.readUInt16BE(18)
      }),
      payload: buffer.subarray(20)
      }
    )
    return packet
    }

  export function packetToBuffer(packet: Packet): Buffer {
    let buffer = Buffer.alloc(20 + (packet.payload ? packet.payload.length : 0))
    let p = packet.header.pType.toString(16);
    let v = packet.header.version.toString(16);
    let pv = p + v;
    let typeAndVer = parseInt(pv,16)



    buffer.writeUInt8(typeAndVer, 0)
    buffer.writeUInt8(EXTENSION, 1)
    buffer.writeUInt16BE(packet.header.connectionId, 2);
    buffer.writeUInt32BE(packet.header.timestamp, 4);
    buffer.writeUInt32BE(packet.header.timestampDiff as number, 8);
    buffer.writeUInt32BE(packet.header.wndSize as number, 12);
    buffer.writeUInt16BE(packet.header.seqNr, 16);
    buffer.writeUInt16BE(packet.header.seqNr, 18);
    
    if (packet.payload) {
      Buffer.concat([buffer, Buffer.from(packet.payload)])
    }
    return buffer
  
  }