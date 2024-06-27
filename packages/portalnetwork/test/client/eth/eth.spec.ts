import { assert, describe, it } from 'vitest'

import { PortalNetwork } from '../../../src/client/client.js'
import { NetworkId } from '../../../src/networks/types.js'

import type { HistoryNetwork } from '../../../src/networks/history/history.js'
import type { StateNetwork } from '../../../src/networks/state/state.js'

describe('ETH class base level API checks', async () => {
  const ultralight = await PortalNetwork.create({
    bindAddress: '127.0.0.1',
    supportedNetworks: [
      { networkId: NetworkId.HistoryNetwork, radius: 1n },
      { networkId: NetworkId.StateNetwork, radius: 1n },
    ],
  })
  const history = ultralight.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const state = ultralight.networks.get(NetworkId.StateNetwork) as StateNetwork

  it('should instantiate with history and state networks active', async () => {
    assert.isDefined(history)
    assert.isDefined(state)
  })

  it('networkCheck should check for active/inactive networks', () => {
    // @ts-expect-error
    assert.throws(() => ultralight.ETH['networkCheck']([NetworkId.HeaderGossipNetwork]))
    assert.doesNotThrow(() => ultralight.ETH['networkCheck']([NetworkId.StateNetwork]))
  })
})
