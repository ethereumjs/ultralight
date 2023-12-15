import { fromHexString, toHexString } from '@chainsafe/ssz'
import { assert, describe, it } from 'vitest'

import { constructTrieNodeContentId, tightlyPackNibbles } from '../../src/networks/state/index.js'

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

describe('tightly pack nibbles', () => {
  it('should pack [] into []', () => {
    const packed = tightlyPackNibbles(Uint8Array.from(testCases[0]))
    assert.equal(packed.length, 0)
    assert.deepEqual(packed, Uint8Array.from([]))
  })
  it('should pack 2 nibbles into 1 byte', () => {
    // [0x01, 0x0a] -> [0x1a]
    const packed = tightlyPackNibbles(Uint8Array.from(testCases[2]))
    assert.equal(packed.length, 1)
    assert.deepEqual(packed, Uint8Array.from([0x1a]))
  })
  it('should pack 4 nibbles into 2 bytes', () => {
    // [0x03, 0x0c, 0x07, 0x0f] -> [0x3c, 0x7f]
    const packed = tightlyPackNibbles(Uint8Array.from(testCases[4]))
    assert.equal(packed.length, 2)
    assert.deepEqual(packed, Uint8Array.from([0x3c, 0x7f]))
  })
  it('should throw on odd length path', () => {
    try {
      tightlyPackNibbles(Uint8Array.from(testCases[1]))
      assert.fail('should throw')
    } catch (err: any) {
      assert.equal(err.message, 'path must be even length')
    }
  })
  it('should throw if value is not a nibble', () => {
    try {
      tightlyPackNibbles(Uint8Array.from(testCases[7]))
      assert.fail('should throw')
    } catch (err: any) {
      assert.equal(err.message, 'path must be a bytestring of nibbles')
    }
  })
})

