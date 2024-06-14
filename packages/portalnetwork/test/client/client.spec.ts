import { assert, describe, it } from 'vitest'

import { NetworkId, PortalNetwork, TransportLayer } from '../../src/index.js'
describe('Client unit tests', () => {
  it('node initialization/startup', async () => {
    const node = await PortalNetwork.create({
      bindAddress: '192.168.0.1',
      transport: TransportLayer.WEB,
      supportedNetworks: [{ networkId: NetworkId.HistoryNetwork, radius: 1n }],
    })
    assert.equal(
      node.discv5.enr.getLocationMultiaddr('udp')!.toOptions().host,
      '192.168.0.1',
      'created portal network node with correct ip address',
    )
  })
})
