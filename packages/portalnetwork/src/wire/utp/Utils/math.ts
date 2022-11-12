import { Uint16 } from '../index.js'

export function MicrosecondTimeStamp(): number {
  // this is only a millisecond timestamp
  // process.hrtime.bigint() doesn't seem to work in the browser?
  const time = Date.now()
  return time * 1000
}

export function Bytes32TimeStamp(): number {
  return MicrosecondTimeStamp() & 0xffff
}

export function randUint16(): Uint16 {
  return Math.floor(Math.random() * 2 ** 15)
}

export function bitLength(n: number): number {
  const bitstring = n.toString(2)
  if (bitstring === '0') {
    return 0
  }
  return bitstring.length
}

export function nextPowerOf2(n: number): number {
  return n <= 0 ? 1 : Math.pow(2, bitLength(n - 1))
}

export const bitmap = [
  8, 7, 6, 5, 4, 3, 2, 1, 16, 15, 14, 13, 12, 11, 10, 9, 25, 24, 23, 22, 21, 20, 19, 18, 17, 32, 31,
  30, 29, 28, 27, 26,
]
