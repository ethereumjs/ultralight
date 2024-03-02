import { bytesToUnprefixedHex } from '@ethereumjs/util'
import { keccak256 } from 'ethereum-cryptography/keccak.js'

import { Nibble, type TNibble } from './types.js'

type Nibbles = TNibble[]

const isNibble = (value: string): boolean => {
  return typeof Nibble[value as TNibble] !== 'undefined'
}

// Utility function to convert a nibble into its numerical representation
const nibbleToNumber = (nibble: TNibble): number => parseInt(nibble, 16)

// Utility function to convert a number to a nibble string
const numberToNibble = (number: number): TNibble => number.toString(16) as TNibble

export const addressToNibbles = (address: Uint8Array): Nibbles => {
  const hash = keccak256(address)
  const hashStr = bytesToUnprefixedHex(hash)
  const nibbles: Nibbles = hashStr.split('') as Nibbles
  return nibbles
}

// Pack function
export function packNibbles(nibbles: string[]): Uint8Array {
  if (nibbles.some((n) => !isNibble(n))) {
    throw new Error(`path: [${nibbles}] must be an array of nibbles`)
  }
  const length = nibbles.length
  const isOddLength = length % 2 !== 0
  const result: number[] = []

  // First byte encoding based on the length
  if (isOddLength) {
    // Odd number of nibbles
    result.push(0x10 | nibbleToNumber(nibbles[0] as TNibble))
  } else {
    // Even number of nibbles
    result.push(0x00)
  }

  // Pack remaining nibbles
  for (let i = isOddLength ? 1 : 0; i < length; i += 2) {
    const highNibble = nibbleToNumber(nibbles[i] as TNibble)
    const lowNibble = i + 1 < length ? nibbleToNumber(nibbles[i + 1] as TNibble) : 0
    result.push((highNibble << 4) | lowNibble)
  }

  return Uint8Array.from(result)
}

// Unpack function
export function unpackNibbles(packed: Uint8Array): Nibbles {
  if (packed.length === 0) return []
  const bytes = [...packed]
  const firstByte = bytes[0]
  const isOddLength = (firstByte & 0x10) !== 0
  const nibbles: Nibbles = []

  // Adjusting how the initial byte is processed based on odd or even length
  if (isOddLength) {
    // Directly add the first nibble for odd lengths
    nibbles.push(numberToNibble(firstByte & 0x0f))
  }

  // Correctly processing subsequent bytes
  for (let i = 1; i < bytes.length; i++) {
    const byte = bytes[i]
    nibbles.push(numberToNibble(byte >> 4)) // High nibble
    // For the last byte, avoid adding a low nibble if it's padding (even length)
    if (i < bytes.length - 1 || isOddLength || firstByte === 0x00) {
      nibbles.push(numberToNibble(byte & 0x0f)) // Low nibble
    }
  }

  return nibbles
}
