import { assert, describe, it } from 'vitest'
import { PortalNetwork } from '../../../src/client/client.js'
import { NetworkId } from '../../../src/networks/types.js'
import { HistoryNetwork } from '../../../src/networks/history/history.js'
import { StateNetwork } from '../../../src/networks/state/state.js'

describe('ETH class base level API checks', async () => {
  const ultralight = await PortalNetwork.create({
    supportedNetworks: [NetworkId.HistoryNetwork, NetworkId.StateNetwork],
  })
  const history = ultralight.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const state = ultralight.networks.get(NetworkId.StateNetwork) as StateNetwork

  it('should instantiate with history and state networks active', async () => {
    assert.isDefined(history)
    assert.isDefined(state)
  })

  it('networkCheck should check for active/inactive networks', () => {
    assert.throws(() => ultralight.ETH['networkCheck']([NetworkId.HeaderGossipNetwork]))
    assert.doesNotThrow(() => ultralight.ETH['networkCheck']([NetworkId.StateNetwork]))
  })
})
