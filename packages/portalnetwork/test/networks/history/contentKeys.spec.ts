import { hexToBytes } from '@ethereumjs/util'
import { createRequire } from 'module'
import { assert, describe, it } from 'vitest'

import {
  HistoryNetworkContentType,
  decodeHistoryNetworkContentKey,
  fromHexString,
  getContentId,
  getContentKey,
} from '../../../src/index.js'

const require = createRequire(import.meta.url)
const testVectors = require('../../testData/testVectors.json')

describe('ContentKey and ContentId', () => {
  it('block header', () => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockHeader
    const contentKey = getContentKey(HistoryNetworkContentType.BlockHeader, hexToBytes(blockHash))
    const contentId = getContentId(HistoryNetworkContentType.BlockHeader, fromHexString(blockHash))
    const decoded = decodeHistoryNetworkContentKey(fromHexString(contentKey))

    assert.equal(contentKey, contentKeyHex, 'encoded content key')
    assert.equal(contentId, contentIdHex, 'encoded content id')
    assert.deepEqual(decoded.keyOpt, fromHexString(blockHash), 'decoded hash from content key')
    assert.equal(
      decoded.contentType,
      HistoryNetworkContentType.BlockHeader,
      'decoded type from content key',
    )
  })
  it('block body', () => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.blockBody
    const contentKey = getContentKey(HistoryNetworkContentType.BlockBody, hexToBytes(blockHash))
    const contentId = getContentId(HistoryNetworkContentType.BlockBody, fromHexString(blockHash))
    const decoded = decodeHistoryNetworkContentKey(fromHexString(contentKey))

    assert.equal(contentKey, contentKeyHex, 'encoded content key')
    assert.equal(contentId, contentIdHex, 'encoded content id')
    assert.deepEqual(decoded.keyOpt, fromHexString(blockHash), 'decoded hash from content key')
    assert.equal(
      decoded.contentType,
      HistoryNetworkContentType.BlockBody,
      'decoded type from content key',
    )
  })
  it('receipts', () => {
    const { blockHash, contentKeyHex, contentIdHex } = testVectors.receipts
    const contentKey = getContentKey(HistoryNetworkContentType.Receipt, hexToBytes(blockHash))
    const contentId = getContentId(HistoryNetworkContentType.Receipt, fromHexString(blockHash))
    const decoded = decodeHistoryNetworkContentKey(fromHexString(contentKey))

    assert.equal(contentKey, contentKeyHex, 'encoded content key')
    assert.equal(contentId, contentIdHex, 'encoded content id')
    assert.deepEqual(decoded.keyOpt, fromHexString(blockHash), 'decoded hash from content key')
    assert.equal(
      decoded.contentType,
      HistoryNetworkContentType.Receipt,
      'decoded type from content key',
    )
  })
  it('block header by number', () => {
    const { blockNumber, contentKeyHex, contentIdHex } = testVectors.blockHeaderByNumber
    const contentKey = getContentKey(HistoryNetworkContentType.BlockHeaderByNumber, 1000n)
    const contentId = getContentId(HistoryNetworkContentType.BlockHeaderByNumber, 1000n)
    const decoded = decodeHistoryNetworkContentKey(fromHexString(contentKey))
    assert.equal(contentKey, contentKeyHex, 'encoded content key')
    assert.equal(contentId, contentIdHex, 'encoded content id')
    assert.deepEqual(decoded.keyOpt, BigInt(blockNumber), 'decoded block number from content key')
    assert.equal(
      decoded.contentType,
      HistoryNetworkContentType.BlockHeaderByNumber,
      'decoded type from content key',
    )
  })
})
