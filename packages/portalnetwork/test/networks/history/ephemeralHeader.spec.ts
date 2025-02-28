import type { BlockHeader, JsonRpcBlock } from '@ethereumjs/block'
import { Block } from '@ethereumjs/block'
import { hexToBytes } from '@ethereumjs/util'
import { assert, beforeAll, describe, it } from 'vitest'
import {
  EphemeralHeaderPayload,
  HistoryNetworkContentType,
  HistoryRadius,
  PingPongPayloadExtensions,
  PortalNetwork,
  getContentKey,
  getEphemeralHeaderDbKey,
} from '../../../src/index.js'
import latestBlocks from './testData/latest3Blocks.json'

describe('ephemeral header handling', () => {
  let headers: BlockHeader[]
  let headerPayload: Uint8Array
  let contentKey: Uint8Array
  beforeAll(() => {
    headers = []
    headers.push(Block.fromRPC(latestBlocks[0] as JsonRpcBlock, [], { setHardfork: true }).header)
    headers.push(Block.fromRPC(latestBlocks[1] as JsonRpcBlock, [], { setHardfork: true }).header)
    headers.push(Block.fromRPC(latestBlocks[2] as JsonRpcBlock, [], { setHardfork: true }).header)
    headerPayload = EphemeralHeaderPayload.serialize(headers.map((h) => h.serialize()))
    contentKey = getContentKey(HistoryNetworkContentType.EphemeralHeader, {
      blockHash: headers[0].hash(),
      ancestorCount: headers.length - 1,
    })
  })
  it('should be able to store a valid ephemeral header payload', async () => {
    const node = await PortalNetwork.create({})
    const network = node.network()['0x500b']

    await network!.store(contentKey, headerPayload)
    const storedHeaderPayload = await network?.get(getEphemeralHeaderDbKey(headers[0].hash()))
    assert.deepEqual(hexToBytes(storedHeaderPayload!), headers[0].serialize())
    assert.deepEqual(network!.ephemeralHeaderIndex.getByKey(headers[1].number), headers[1].hash())
  })
  it('should produce the correct HISTORY_RADIUS ping payload', async () => {
    const node = await PortalNetwork.create({})
    const network = node.network()['0x500b']
    await network?.store(contentKey, headerPayload)
    const payload = network!.pingPongPayload(PingPongPayloadExtensions.HISTORY_RADIUS_PAYLOAD)
    assert.equal(HistoryRadius.deserialize(payload).ephemeralHeadersCount, 3)
  })
})
