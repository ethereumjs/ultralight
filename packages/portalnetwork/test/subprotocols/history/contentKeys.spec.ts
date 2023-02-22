import tape from 'tape'
import {
  decodeContentKey,
  fromHexString,
  getContentId,
  getContentKey,
  ContentType,
} from '../../../src/index.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const testVectors = require('../../testData/testVectors.json')

tape('ContentKey and ContentId', (t) => {
  t.test('block header', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockHeader
    const contentKey = getContentKey(ContentType.BlockHeader, Buffer.from(fromHexString(blockHash)))
    const contentId = getContentId(ContentType.BlockHeader, blockHash)
    const decoded = decodeContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(decoded.contentType, ContentType.BlockHeader, 'decoded type from content key')
    st.end()
  })
  t.test('block body', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockBody
    const contentKey = getContentKey(ContentType.BlockBody, Buffer.from(fromHexString(blockHash)))
    const contentId = getContentId(ContentType.BlockBody, blockHash)
    const decoded = decodeContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(decoded.contentType, ContentType.BlockBody, 'decoded type from content key')
    st.end()
  })
  t.test('receipts', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.receipts
    const contentKey = getContentKey(ContentType.Receipt, Buffer.from(fromHexString(blockHash)))
    const contentId = getContentId(ContentType.Receipt, blockHash)
    const decoded = decodeContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(decoded.contentType, ContentType.Receipt, 'decoded type from content key')
    st.end()
  })
  t.test('epoch accumulator', (st) => {
    const { epochHash, contentKeyHex, contentIdHex } = testVectors.epochAccumulator
    const contentKey = getContentKey(
      ContentType.EpochAccumulator,
      Buffer.from(fromHexString(epochHash))
    )
    const contentId = getContentId(ContentType.EpochAccumulator, epochHash)
    const decoded = decodeContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, epochHash, 'decoded hash from content key')
    st.equal(decoded.contentType, ContentType.EpochAccumulator, 'decoded type from content key')
    st.end()
  })
})
