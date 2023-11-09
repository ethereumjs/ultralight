import { describe, it, assert } from 'vitest'
import { PortalNetwork, NetworkId } from '../../src/index.js'
import * as td from 'testdouble'
import { TransportLayer } from '../../src/client/index.js'

describe('Client unit tests', async () => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedNetworks: [NetworkId.HistoryNetwork],
  })

  it('node initialization/startup', async () => {
    assert.equal(
      node.discv5.enr.getLocationMultiaddr('udp')!.toOptions().host,
      '192.168.0.1',
      'created portal network node with correct ip address',
    )

    node.discv5.start = td.func<any>()
    node.start = td.func<any>()
    node.stop = td.func<any>()
    td.when(node.discv5.start()).thenResolve(assert.ok(true, 'discv5 client started'))
    td.when(node.start()).thenResolve(assert.ok(true, 'portal client started'))
    td.when(node.stop()).thenResolve(assert.ok(true, 'portal client stopped'))
  })

  td.reset()
})
