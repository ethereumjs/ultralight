import { assert, describe, it } from 'vitest'

import { packNibbles, unpackNibbles } from '../../../src/networks/state/nibbleEncoding.js'
type Nibble =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
const testVectors: [Nibble[], number[]][] = [
  [[], [0x00]],
  [['0'], [0x10]],
  [['1'], [0x11]],
  [
    ['0', '1'],
    [0x00, 0x01],
  ],
  [
    ['1', '2', 'a', 'b'],
    [0x00, 0x12, 0xab],
  ],
  [
    ['1', '2', 'a', 'b', 'c'],
    [0x11, 0x2a, 0xbc],
  ],
]

describe('nibbleEncoding', () => {
  for (const test of testVectors) {
    it('should pack nibbles', () => {
      const packed = packNibbles(test[0])
      assert.deepEqual([...packed], test[1])
    })
  }
})

describe('nibbleDecoding', () => {
  for (const test of testVectors) {
    it('should unpack nibbles', () => {
      const unpacked = unpackNibbles(Uint8Array.from(test[1]))
      assert.deepEqual(unpacked, test[0])
    })
  }
})
