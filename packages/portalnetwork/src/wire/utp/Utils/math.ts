import { Uint16 } from '../index.js'

// 10**9	Nanosecond  ns - one billionth of a second
// 10**6	Microsecond	µs - one millionth of a second  <------- uTP timestamp
// 10**3	Millisecond	ms - one thousandth of a second

// Node:         process.hrtime.bigint()                       - Nanosecond
// Browser/Node: performance.timeOrigin + performance.now()    - Millisecond, accurate to 5µs = 1/2 * 1000 Microseconds
// Browser:      Date.now()                                    - Millisecond

// performance.timeOrigin + performance.now() roughly equals Date.now(), with more accuracy

export function MicrosecondTimeStamp(): number {
  const now = Date.now() % 2 ** 32
  const milli = performance.timeOrigin + performance.now()
  const _micro = Math.round(milli * 1000)
  return now
}

export function Bytes32TimeStamp(): number {
  const timestamp = MicrosecondTimeStamp()
  return timestamp
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
