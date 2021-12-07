import { Uint16, Uint32 } from "..";
import { hrtime } from "process";
import { EXTENSION, ID_MASK, VERSION } from "./constants";
import { PacketHeader, SelectiveAckHeader } from "../Packets/PacketHeader";
import { Packet } from "../Packets/Packet";
import { Duration, Miliseconds } from "../Socket/socketTyping";
import { minimalHeaderSize } from "../Packets/PacketTyping";
import * as Convert from "./Convert";

export function MicrosecondTimeStamp(): bigint {
  let time = hrtime.bigint();
  return time / BigInt(1000);
}

export function Bytes32TimeStamp(): number {
  return Number(MicrosecondTimeStamp()) & 0xFFFF
}

export function randUint16(): Uint16 {
  return Math.random() * 2 ** 16;
}
export function randUint32(): Uint16 {
  return Math.random() * 2 ** 32;
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


