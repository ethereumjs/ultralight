import { Uint16 } from '../index'
import { Duration, Miliseconds } from '../Socket/socketTyping'

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
  return Math.floor(Math.random() * 2 ** 16)
}
export function randUint32(): Uint16 {
  return Math.floor(Math.random() * 2 ** 32)
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

export function sleep(ms: Miliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function max(a: number, b: Duration): Duration {
  return a > b ? a : b
}
