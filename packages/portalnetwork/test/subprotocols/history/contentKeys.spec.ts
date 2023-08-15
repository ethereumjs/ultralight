import tape from 'tape'
import {
  decodeHistoryNetworkContentKey,
  fromHexString,
  getContentId,
  getContentKey,
  HistoryNetworkContentType,
} from '../../../src/index.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const testVectors = require('../../testData/testVectors.json')

tape('ContentKey and ContentId', (t) => {
  t.test('block header', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockHeader
    const contentKey = getContentKey(
      HistoryNetworkContentType.BlockHeader,
      fromHexString(blockHash),
    )
    const contentId = getContentId(HistoryNetworkContentType.BlockHeader, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(
      decoded.contentType,
      HistoryNetworkContentType.BlockHeader,
      'decoded type from content key',
    )
    st.end()
  })
  t.test('block body', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockBody
    const contentKey = getContentKey(HistoryNetworkContentType.BlockBody, fromHexString(blockHash))
    const contentId = getContentId(HistoryNetworkContentType.BlockBody, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(
      decoded.contentType,
      HistoryNetworkContentType.BlockBody,
      'decoded type from content key',
    )
    st.end()
  })
  t.test('receipts', (st) => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.receipts
    const contentKey = getContentKey(HistoryNetworkContentType.Receipt, fromHexString(blockHash))
    const contentId = getContentId(HistoryNetworkContentType.Receipt, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    st.equal(
      decoded.contentType,
      HistoryNetworkContentType.Receipt,
      'decoded type from content key',
    )
    st.end()
  })
  t.test('epoch accumulator', (st) => {
    const { epochHash, contentKeyHex, contentIdHex } = testVectors.epochAccumulator
    const contentKey = getContentKey(
      HistoryNetworkContentType.EpochAccumulator,
      fromHexString(epochHash),
    )
    const contentId = getContentId(HistoryNetworkContentType.EpochAccumulator, epochHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    st.equal(contentKey, contentKeyHex, 'encoded content key')
    st.equal(contentId, contentIdHex, 'encoded content id')
    st.equal(decoded.blockHash, epochHash, 'decoded hash from content key')
    st.equal(
      decoded.contentType,
      HistoryNetworkContentType.EpochAccumulator,
      'decoded type from content key',
    )
    st.end()
  })
})
