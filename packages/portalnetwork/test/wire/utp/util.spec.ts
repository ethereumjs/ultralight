import { randomBytes } from 'crypto'
import { bytesToHex } from '@ethereumjs/util'
import { assert, describe, it } from 'vitest'

import {
  attatchPrefix,
  bitLength,
  dropPrefixes,
  encodeWithVariantPrefix,
  nextPowerOf2,
  parsePrefix,
} from '../../../src/wire/utp/index.js'

describe('uTP utils tests', () => {
  it('bitlength test', () => {
    assert.equal(bitLength(0), 0)
    assert.equal(bitLength(1), 1)
    assert.equal(bitLength(2), 2)
    assert.equal(bitLength(3), 2)
    assert.equal(bitLength(4), 3)
    assert.equal(bitLength(7), 3)
    assert.equal(bitLength(255), 8)
    assert.equal(bitLength(256), 9)
    assert.equal(bitLength(511), 9)
    assert.equal(bitLength(512), 10)
  })
  it('nextPowOfTwo tests', () => {
    assert.equal(nextPowerOf2(0), 1)
    assert.equal(nextPowerOf2(1), 1)
    assert.equal(nextPowerOf2(2), 2)
    assert.equal(nextPowerOf2(3), 4)
    assert.equal(nextPowerOf2(4), 4)
    assert.equal(nextPowerOf2(5), 8)
    assert.equal(nextPowerOf2(9), 16)
    assert.equal(nextPowerOf2(16011), 16384)
  })
  it('VarInt Prefix', () => {
    const contents: Uint8Array[] = []
    const lengths: number[] = []
    let totalLength = 0
    for (let i = 0; i < 10; i++) {
      const length = 1000 + Math.ceil(Math.random() * 10000)
      const content = Uint8Array.from(randomBytes(length))
      lengths.push(length)
      totalLength += length
      contents.push(content)
    }
    const encoded = encodeWithVariantPrefix(contents)
    assert.ok(
      encoded.length > totalLength,
      `Length should be greater with prefixes...${encoded.length} > ${totalLength}`,
    )
    const c = contents[0]
    const ci = attatchPrefix(c)
    assert.ok(ci.length > c.length, `prefix adds length to content, ${ci.length} > ${c.length}`)

    const cii = parsePrefix(ci)
    assert.equal(cii[0], c.length, `Length parsed by parsePrefix, ${cii[0]} = ${c.length}`)
    assert.equal(cii[1], ci.length - c.length, `Offset calculated correctly, ${cii[1]}`)
    const decoded = dropPrefixes(encoded)
    assert.ok(decoded.length > 0, `Decoded returns non-empty array, length = ${decoded.length}`)
    assert.deepEqual(
      contents.length,
      decoded.length,
      `decoded array is same length as original, ${contents.length} = ${decoded.length}`,
    )
    assert.deepEqual(
      contents[0],
      decoded[0],
      `first item matches, "${bytesToHex(contents[0]).slice(0, 5)}..." === "${bytesToHex(
        decoded[0],
      ).slice(0, 5)}..."`,
    )
    assert.deepEqual(contents, decoded, `Whole content array successfully encoded/decoded`)
  })
})
