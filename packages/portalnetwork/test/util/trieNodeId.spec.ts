import { assert, describe, it } from 'vitest'

import { tightlyPackNibbles } from '../../src/networks/state/index.js'

import type { TNibble } from '../../dist/index.js'

const testCases: Array<number[]> = [
  [],
  [0x00],
  [0x01, 0x0a],
  [0x02, 0x0b, 0x08],
  [0x03, 0x0c, 0x07, 0x0f],
  [0x04, 0x0d, 0x06, 0x0e, 0x08],
  [0x1a], // not a nibble
  [0x0b, 0x2c], // not all nibbles
  Array.from({ length: 65 }, () => Math.floor(Math.random() * 16)), // too long
]

const looseNibbles = (path: number[]) => {
  return path.map((n) => n.toString(16)) as TNibble[]
}

describe('tightly pack nibbles', () => {
  it('should pack [] into []', () => {
    const packed = tightlyPackNibbles(looseNibbles(testCases[0]))
    assert.equal(packed.packedNibbles.length, 0)
    assert.deepEqual(packed.packedNibbles, Uint8Array.from([]))
  })
  it('should pack 2 nibbles into 1 byte', () => {
    // [0x01, 0x0a] -> [0x1a]
    const packed = tightlyPackNibbles(looseNibbles(testCases[2]))
    assert.equal(packed.packedNibbles.length, 1)
    assert.deepEqual(packed.packedNibbles, Uint8Array.from([0x1a]))
  })
  it('should pack 4 nibbles into 2 bytes', () => {
    // [0x03, 0x0c, 0x07, 0x0f] -> [0x3c, 0x7f]
    const packed = tightlyPackNibbles(looseNibbles(testCases[4]))
    assert.equal(packed.packedNibbles.length, 2)
    assert.deepEqual(packed.packedNibbles, Uint8Array.from([0x3c, 0x7f]))
  })
  it('should pack odd length path', () => {
    const packed = tightlyPackNibbles(looseNibbles(testCases[1]))
    assert.equal(packed.isOddLength, true)
    assert.equal(packed.packedNibbles.length, 1)
    assert.deepEqual(packed.packedNibbles, Uint8Array.from([0x00]))
  })
  it('should throw if value is not a nibble', () => {
    try {
      tightlyPackNibbles(looseNibbles(testCases[7]))
      assert.fail('should throw')
    } catch (err: any) {
      assert.equal(err.message, `path: [${looseNibbles(testCases[7])}] must be an array of nibbles`)
    }
  })
})
