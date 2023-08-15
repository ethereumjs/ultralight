import { describe, it, assert } from 'vitest'
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

describe('ContentKey and ContentId', () => {
  it('block header', () => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockHeader
    const contentKey = getContentKey(
      HistoryNetworkContentType.BlockHeader,
      fromHexString(blockHash),
    )
    const contentId = getContentId(HistoryNetworkContentType.BlockHeader, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    assert.equal(contentKey, contentKeyHex, 'encoded content key')
    assert.equal(contentId, contentIdHex, 'encoded content id')
    assert.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    assert.equal(
      decoded.contentType,
      HistoryNetworkContentType.BlockHeader,
      'decoded type from content key',
    )
  })
  it('block body', () => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockBody
    const contentKey = getContentKey(HistoryNetworkContentType.BlockBody, fromHexString(blockHash))
    const contentId = getContentId(HistoryNetworkContentType.BlockBody, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    assert.equal(contentKey, contentKeyHex, 'encoded content key')
    assert.equal(contentId, contentIdHex, 'encoded content id')
    assert.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    assert.equal(
      decoded.contentType,
      HistoryNetworkContentType.BlockBody,
      'decoded type from content key',
    )
  })
  it('receipts', () => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.receipts
    const contentKey = getContentKey(HistoryNetworkContentType.Receipt, fromHexString(blockHash))
    const contentId = getContentId(HistoryNetworkContentType.Receipt, blockHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    assert.equal(contentKey, contentKeyHex, 'encoded content key')
    assert.equal(contentId, contentIdHex, 'encoded content id')
    assert.equal(decoded.blockHash, blockHash, 'decoded hash from content key')
    assert.equal(
      decoded.contentType,
      HistoryNetworkContentType.Receipt,
      'decoded type from content key',
    )
  })
  it('epoch accumulator', () => {
    const { epochHash, contentKeyHex, contentIdHex } = testVectors.epochAccumulator
    const contentKey = getContentKey(
      HistoryNetworkContentType.EpochAccumulator,
      fromHexString(epochHash),
    )
    const contentId = getContentId(HistoryNetworkContentType.EpochAccumulator, epochHash)
    const decoded = decodeHistoryNetworkContentKey(contentKey)

    assert.equal(contentKey, contentKeyHex, 'encoded content key')
    assert.equal(contentId, contentIdHex, 'encoded content id')
    assert.equal(decoded.blockHash, epochHash, 'decoded hash from content key')
    assert.equal(
      decoded.contentType,
      HistoryNetworkContentType.EpochAccumulator,
      'decoded type from content key',
    )
  })
})
