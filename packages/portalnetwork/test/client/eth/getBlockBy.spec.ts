import { hexToBytes } from '@ethereumjs/util'
import { assert, describe, it } from 'vitest'
import { createPortalNetwork } from '../../../src/client/index.js'
import { NetworkId } from '../../../src/networks/types.js'

import type { HistoryNetwork } from '../../../src/networks/history/history.js'
describe('getBlockByHash', async () => {
  const ultralight = await createPortalNetwork({
    bindAddress: '127.0.0.1',
  })
  it('should not find a block by hash', async () => {
    const blockHash = '0x1e98ea9bdf6e44eaed730041682e7db748812d5baef84a38435c8ad5f6c5d1e2'
    const history = ultralight.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    await history.indexBlockHash(21591997n, blockHash)
    const block = await ultralight.ETH.getBlockByHash(hexToBytes(blockHash), false)
    assert.equal(block, undefined)
  })
  it('should not find a block by number', async () => {
    const blockNumber = 21591997n
    const blockHash = '0x1e98ea9bdf6e44eaed730041682e7db748812d5baef84a38435c8ad5f6c5d1e2'
    const history = ultralight.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    await history.indexBlockHash(blockNumber, blockHash)
    const block = await ultralight.ETH.getBlockByNumber(blockNumber, false)
    assert.equal(block, undefined)
  })
})
