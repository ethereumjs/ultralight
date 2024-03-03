import { assert, describe, it } from 'vitest'

import { packNibbles } from '../../src/networks/state/nibbleEncoding.js'

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
  return path.map((n) => n.toString(16))
}

describe('tightly pack nibbles', () => {
  it('should pack [] into []', () => {
    const packed = packNibbles(looseNibbles(testCases[0]))
    assert.equal(packed.length, 1)
    assert.deepEqual(packed, Uint8Array.from([0x00]))
  })
  it('should pack 2 nibbles into 2 byte', () => {
    // [0x01, 0x0a] -> [0x1a]
    const packed = packNibbles(looseNibbles(testCases[2]))
    assert.equal(packed.length, 2)
    assert.deepEqual(packed, Uint8Array.from([0x00, 0x1a]))
  })
  it('should pack 4 nibbles into 3 bytes', () => {
    // [0x03, 0x0c, 0x07, 0x0f] -> [0x3c, 0x7f]
    const packed = packNibbles(looseNibbles(testCases[4]))
    assert.equal(packed.length, 3)
    assert.deepEqual(packed, Uint8Array.from([0x00, 0x3c, 0x7f]))
  })
  it('should pack odd length path', () => {
    const packed = packNibbles(looseNibbles(testCases[1]))
    assert.equal(packed.length, 1)
    assert.deepEqual(packed, Uint8Array.from([0x10]))
  })
  it('should throw if value is not a nibble', () => {
    try {
      packNibbles(looseNibbles(testCases[7]))
      assert.fail('should throw')
    } catch (err: any) {
      assert.equal(err.message, `path: [${looseNibbles(testCases[7])}] must be an array of nibbles`)
    }
  })
})
