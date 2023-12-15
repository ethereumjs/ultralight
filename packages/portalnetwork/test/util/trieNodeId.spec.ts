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

const nodeHash = fromHexString('0x' + 'abcd'.repeat(16))
// [0xab, 0xcd, 0xab, 0xcd, ...]

describe('constructTrieNodeContentId', () => {
  it('should construct a trie node content id for a rootnode (path = [])', () => {
    const path = Uint8Array.from(testCases[0])
    const contentId = constructTrieNodeContentId(path, nodeHash)
    assert.equal(contentId.length, 32)
    assert.deepEqual(contentId, nodeHash)
  })
  it('should contruct a trie node content id from node with path length = 1', () => {
    const path = Uint8Array.from(testCases[1])
    const contentId = constructTrieNodeContentId(path, nodeHash)
    assert.equal(contentId.length, 32)
    const expected = fromHexString('0x' + '0b' + 'cd' + 'abcd'.repeat(15))
    assert.deepEqual(contentId, expected)
  })
  it('should contruct a trie node content id from node with odd length path', () => {
    const path = Uint8Array.from(testCases[3])
    // [0x02, 0x0b, 0x08] -> [0x 2 b 8 _ ]
    // node hash (trimmed)-> [0x _ _ _ dabcd... ]
    //                       [0x 2 b 8 dabcd... ]
    const contentId = constructTrieNodeContentId(path, nodeHash)
    assert.equal(contentId.length, 32)
    const str = '0x' + '2b' + '8d' + 'abcd'.repeat(15)
    const expected = fromHexString(str)
    assert.equal(str, toHexString(contentId))
    assert.deepEqual(contentId, expected)
  })
  it('should construct a trie node content id from node with even length path', () => {
    const path = Uint8Array.from(testCases[2])
    // [0x01, 0x0a] -> [0x1a]
    const contentId = constructTrieNodeContentId(path, nodeHash)
    assert.equal(contentId.length, 32)
    const expected = fromHexString('0x' + '1a' + 'cd' + 'abcd'.repeat(15))
    assert.deepEqual(contentId, expected)
  })
  it('should construct a trie node content id from node with even length path', () => {
    const path = Uint8Array.from(testCases[4])
    // [0x03, 0x0c, 0x07, 0x0f] -> [0x3c, 0x7f]
    const contentId = constructTrieNodeContentId(path, nodeHash)
    assert.equal(contentId.length, 32)
    const expected = fromHexString('0x' + '3c' + '7f' + 'abcd'.repeat(15))
    assert.deepEqual(contentId, expected)
  })
})
