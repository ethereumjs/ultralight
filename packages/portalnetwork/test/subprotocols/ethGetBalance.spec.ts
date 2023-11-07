import { describe, it, assert, test } from 'vitest'
import {
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  addRLPSerializedBlock,
  toHexString,
} from '../../src'
import testBlockData from './state/testdata/testblocks.json'
import { Block } from '@ethereumjs/block'

describe('ethGetBalance using HistoryProtocol and StateProtocol', async () => {
  const ultralight = await PortalNetwork.create({
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.StateNetwork],
  })
  const history = ultralight.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const state = ultralight.protocols.get(ProtocolId.StateNetwork)

  it('should instantiate with history and state networks active', async () => {
    assert.isDefined(history)
    assert.isDefined(state)
  })

  for (const blockNumber of Object.keys(testBlockData)) {
    const block = Block.fromRPC(testBlockData[blockNumber])
    await addRLPSerializedBlock(toHexString(block.serialize()), toHexString(block.hash()), history)
    const stored = await history.ETH.getBlockByNumber(BigInt(blockNumber), true)
    it(`should store block ${blockNumber}`, async () => {
      assert.isDefined(stored)
    })
  }
})
