import tape from 'tape'
import {
  decodeHistoryNetworkContentKey,
  fromHexString,
  getHistoryNetworkContentId,
  getHistoryNetworkContentKey,
  HistoryNetworkContentTypes,
} from '../../../src/index.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const testVectors = require('./testdata/testVectors.json')

tape('ContentKey and ContentId', (t) => {
  t.test('block header', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockHeader
    const contentKey = getHistoryNetworkContentKey(
      HistoryNetworkContentTypes.BlockHeader,
      Buffer.from(fromHexString(blockHash))
    )
    const contentId = getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockHeader, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(
      decoded.contentType,
      HistoryNetworkContentTypes.BlockHeader,
      'decoded type from content key'
    )
    st.end()
  })
  t.test('block body', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockBody
    const contentKey = getHistoryNetworkContentKey(
      HistoryNetworkContentTypes.BlockBody,
      Buffer.from(fromHexString(blockHash))
    )
    const contentId = getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockBody, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(
      decoded.contentType,
      HistoryNetworkContentTypes.BlockBody,
      'decoded type from content key'
    )
    st.end()
  })
  t.test('receipts', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.receipts
    const contentKey = getHistoryNetworkContentKey(
      HistoryNetworkContentTypes.Receipt,
      Buffer.from(fromHexString(blockHash))
    )
    const contentId = getHistoryNetworkContentId(HistoryNetworkContentTypes.Receipt, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(
      decoded.contentType,
      HistoryNetworkContentTypes.Receipt,
      'decoded type from content key'
    )
    st.end()
  })
  t.test('epoch accumulator', (st) => {
    const { epochHash, contentKeyHex, contentIdHex } = testVectors.epochAccumulator
    const contentKey = getHistoryNetworkContentKey(
      HistoryNetworkContentTypes.EpochAccumulator,
      Buffer.from(fromHexString(epochHash))
    )
    const contentId = getHistoryNetworkContentId(
      HistoryNetworkContentTypes.EpochAccumulator,
      epochHash
    )
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, epochHash, 'decoded hash from content key')
    st.equal(
      decoded.contentType,
      HistoryNetworkContentTypes.EpochAccumulator,
      'decoded type from content key'
    )
    st.end()
  })
})
