import { hexToBytes } from '@ethereumjs/util'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { assert, describe, it } from 'vitest'

import {
  BlockHeaderByNumberKey,
  BlockHeaderWithProof,
  HistoryNetwork,
  HistoryNetworkContentType,
  NetworkId,
  PortalNetwork,
  decodeHistoryNetworkContentKey,
  fromHexString,
} from '../../../src/index.js'

import testdata from './testData/headerWithProof.json'

describe('Retrieve Block Header By Number', async () => {
  const HWP1000001 = fromHexString(testdata[1000001].content_value)
  const HWP1000002 = fromHexString(testdata[1000002].content_value)
  const header100001 = BlockHeaderWithProof.deserialize(HWP1000001).header
  const header100002 = BlockHeaderWithProof.deserialize(HWP1000002).header

  const hash100001 = testdata[1000001].hash
  const hash100002 = testdata[1000002].hash

  const contentKey100001 = BlockHeaderByNumberKey(1000001n)
  const contentKey100002 = BlockHeaderByNumberKey(1000002n)

  it('Should decode content keys', () => {
    assert.deepEqual(decodeHistoryNetworkContentKey(contentKey100001), {
      contentType: HistoryNetworkContentType.BlockHeaderByNumber,
      keyOpt: 1000001n,
    })
    assert.deepEqual(decodeHistoryNetworkContentKey(contentKey100002), {
      contentType: HistoryNetworkContentType.BlockHeaderByNumber,
      keyOpt: 1000002n,
    })
  })
  const client = await PortalNetwork.create({})
  const history = new HistoryNetwork({
    client,
    networkId: NetworkId.HistoryNetwork,
  })
  client.networks.set(NetworkId.HistoryNetwork, history)
  client.ETH.history = history

  await history.store(contentKey100001, HWP1000001)
  await history.store(contentKey100002, HWP1000002)

  it('Should retrieve block header by number', async () => {
    const header = await history.getBlockHeaderFromDB({ blockNumber: 1000001n })
    assert.deepEqual(header, header100001)
  })
  it('Should retrieve block header by number', async () => {
    const header = await history.getBlockHeaderFromDB({ blockNumber: 1000002n })
    assert.deepEqual(header, header100002)
  })

  it('Should retrieve block header by hash', async () => {
    const header = await history.getBlockHeaderFromDB({ blockHash: fromHexString(hash100001) })
    assert.deepEqual(header, header100001)
  })
  it('Should retrieve block header by hash', async () => {
    const header = await history.getBlockHeaderFromDB({ blockHash: fromHexString(hash100002) })
    assert.deepEqual(header, header100002)
  })

  it('Should retrieve block by number', async () => {
    const block = await history.getBlockFromDB({ blockNumber: 1000001n }, false)
    assert.deepEqual(block.header.serialize(), header100001)
  })
  it('Should retrieve block by number', async () => {
    const block = await history.getBlockFromDB({ blockNumber: 1000002n }, false)
    assert.deepEqual(block.header.serialize(), header100002)
  })
  it('Should retrieve block by number', async () => {
    const block = await history.getBlockFromDB({ blockNumber: 1000002n }, false)
    assert.deepEqual(block.header.serialize(), header100002)
  })

  it('Should retrieve block by hash', async () => {
    const block = await history.getBlockFromDB({ blockHash: keccak256(header100001) }, false)
    assert.deepEqual(block.header.serialize(), header100001)
  })
  it('Should retrieve block by hash', async () => {
    const block = await history.getBlockFromDB({ blockHash: keccak256(header100002) }, false)
    assert.deepEqual(block.header.serialize(), header100002)
  })
  it('Should retrieve locally via eth_getBlockByNumber', async () => {
    const block = await client.ETH.getBlockByNumber(1000001n, false)
    assert.isDefined(block)
    assert.deepEqual(block!.header.serialize(), header100001)
  })
  it('Should retrieve locally via eth_getBlockByNumber', async () => {
    const block = await client.ETH.getBlockByNumber(1000002n, false)
    assert.isDefined(block)
    assert.deepEqual(block!.header.serialize(), header100002)
  })

  it('Should retrieve locally via eth_getBlockByHash', async () => {
    const block = await client.ETH.getBlockByHash(hexToBytes(hash100001), false)
    assert.isDefined(block)
    assert.deepEqual(block!.header.serialize(), header100001)
  })
  it('Should retrieve locally via eth_getBlockByHash', async () => {
    const block = await client.ETH.getBlockByHash(hexToBytes(hash100002), false)
    assert.isDefined(block)
    assert.deepEqual(block!.header.serialize(), header100002)
  })
})
