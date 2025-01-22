import { assert, describe, it } from 'vitest'
import { randomBytes } from '@ethereumjs/util'
import { PortalNetwork } from '../../../src/client/client.js'
import { NetworkId } from '../../../src/networks/types.js'

import type { HistoryNetwork } from '../../../src/networks/history/history.js'
describe('ETH class base level API checks', async () => {
    const ultralight = await PortalNetwork.create({
        bindAddress: '127.0.0.1',
    })
    it('should get stuck in an infinite loop', async () => {
        const block = await ultralight.ETH.getBlockByHash(randomBytes(32), false)
        console.log('Block', block)
    })
})
