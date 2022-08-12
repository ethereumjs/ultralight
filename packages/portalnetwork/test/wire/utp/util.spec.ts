import { toHexString } from '@chainsafe/ssz'
import { randomBytes } from 'crypto'
import tape from 'tape'
import {
  attatchPrefix,
  bitLength,
  dropPrefixes,
  encodeWithVariantPrefix,
  nextPowerOf2,
  parsePrefix,
} from '../../../src/wire/utp/index.js'

tape('uTP utils tests', (t) => {
  t.test('bitlength test', (st) => {
    st.equal(bitLength(0), 0)
    st.equal(bitLength(1), 1)
    st.equal(bitLength(2), 2)
    st.equal(bitLength(3), 2)
    st.equal(bitLength(4), 3)
    st.equal(bitLength(7), 3)
    st.equal(bitLength(255), 8)
    st.equal(bitLength(256), 9)
    st.equal(bitLength(511), 9)
    st.equal(bitLength(512), 10)
    st.end()
  })
  t.test('nextPowOfTwo tests', (st) => {
    st.equal(nextPowerOf2(0), 1)
    st.equal(nextPowerOf2(1), 1)
    st.equal(nextPowerOf2(2), 2)
    st.equal(nextPowerOf2(3), 4)
    st.equal(nextPowerOf2(4), 4)
    st.equal(nextPowerOf2(5), 8)
    st.equal(nextPowerOf2(9), 16)
    st.equal(nextPowerOf2(16011), 16384)
    st.end()
  })
  t.test('VarInt Prefix', (st) => {
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
    st.ok(
      encoded.length > totalLength,
      `Length should be greater with prefixes...${encoded.length} > ${totalLength}`
    )
    const c = contents[0]
    const ci = attatchPrefix(c)
    st.ok(ci.length > c.length, `prefix adds length to content, ${ci.length} > ${c.length}`)

    const cii = parsePrefix(ci)
    st.equal(cii[0], c.length, `Length parsed by parsePrefix, ${cii[0]} = ${c.length}`)
    st.equal(cii[1], ci.length - c.length, `Offset calculated correctly, ${cii[1]}`)
    const decoded = dropPrefixes(encoded)
    st.ok(decoded.length > 0, `Decoded returns non-empty array, length = ${decoded.length}`)
    st.deepEqual(
      contents.length,
      decoded.length,
      `decoded array is same length as original, ${contents.length} = ${decoded.length}`
    )
    st.deepEqual(
      contents[0],
      decoded[0],
      `first item matches, "${toHexString(contents[0]).slice(0, 5)}..." === "${toHexString(
        decoded[0]
      ).slice(0, 5)}..."`
    )
    st.deepEqual(contents, decoded, `Whole content array successfully encoded/decoded`)

    st.end()
  })
})
