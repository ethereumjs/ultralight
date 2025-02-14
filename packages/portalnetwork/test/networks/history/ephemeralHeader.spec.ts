import { assert, describe, it } from 'vitest'
import { blockHeaderFromRpc } from '@ethereumjs/block/header-from-rpc'
import type { BlockHeader, JsonRpcBlock } from '@ethereumjs/block'
import latestBlocks from './testData/latest3Blocks.json'
import {
  EphemeralHeaderPayload,
  HistoryNetworkContentType,
  PortalNetwork,
  getContentKey,
  getEphemeralHeaderDbKey,
} from '../../../src/index.js'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
describe('ephemeral header handling', () => {
  it('should be able to store a valid ephemeral header payload', async () => {
    const node = await PortalNetwork.create({})
    const network = node.network()['0x500b']
    const headers: BlockHeader[] = []
    headers.push(blockHeaderFromRpc(latestBlocks[0] as JsonRpcBlock, { setHardfork: true }))
    headers.push(blockHeaderFromRpc(latestBlocks[1] as JsonRpcBlock, { setHardfork: true }))
    headers.push(blockHeaderFromRpc(latestBlocks[2] as JsonRpcBlock, { setHardfork: true }))
    const headerPayload = EphemeralHeaderPayload.serialize(headers.map((h) => h.serialize()))
    const contentKey = getContentKey(HistoryNetworkContentType.EphemeralHeader, {
      blockHash: headers[0].hash(),
      ancestorCount: headers.length,
    })
    await network?.store(contentKey, headerPayload)
    const storedHeaderPayload = await network?.get(getEphemeralHeaderDbKey(headers[0].hash()))
    assert.deepEqual(hexToBytes(storedHeaderPayload!), headers[0].serialize())
    assert.equal(
      network?.ephemeralHeaderIndex.get(headers[1].number),
      bytesToHex(headers[1].hash()),
    )
  })
})
