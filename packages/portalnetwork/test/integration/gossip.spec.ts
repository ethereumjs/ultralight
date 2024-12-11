import { SignableENR } from '@chainsafe/enr'
import { hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, beforeAll, describe, it } from 'vitest'
import { PortalNetwork } from '../../src/client/client.js'
import { TransportLayer } from '../../src/client/types.js'
import { getContentKey } from '../../src/index.js'
import { HistoryNetworkContentType } from '../../src/networks/history/types.js'
import { NetworkId } from '../../src/networks/types.js'
import testdata from '../networks/history/testData/headerWithProof.json'
describe('gossip tests', () => {
  let node1: PortalNetwork
  let node2: PortalNetwork
  beforeAll(async () => {
    const privateKeys = [
      '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
      '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
    ]

    const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
    const enr1 = SignableENR.createFromPrivateKey(pk1)
    const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1]).slice(-36))
    const enr2 = SignableENR.createFromPrivateKey(pk2)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/5034`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/5035`)
    enr2.setLocationMultiaddr(initMa2)
    node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        privateKey: pk1,
      },
    })
    node2 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
      config: {
        enr: enr2,
        bindAddrs: {
          ip4: initMa2,
        },
        privateKey: pk2,
      },
    })

    await node1.start()
    await node2.start()
  })
  it('should be able to gossip', async () => {
    const network1 = node1.network()['0x500b']!
    const HWP1000001 = hexToBytes(testdata[1000001].content_value)
    const HWP1000002 = hexToBytes(testdata[1000002].content_value)

    const contentKey100001 = getContentKey(
      HistoryNetworkContentType.BlockHeader,
      hexToBytes(testdata[1000001].hash),
    )
    const contentKey100002 = getContentKey(
      HistoryNetworkContentType.BlockHeader,
      hexToBytes(testdata[1000002].hash),
    )
    await network1.store(contentKey100001, HWP1000001)
    await network1.store(contentKey100002, HWP1000002)

    assert.equal(network1.gossipManager.pulse, 26)
    network1.gossipManager.setPulse(2)
    await node1.network()['0x500b']?.sendPing(node2.discv5.enr.toENR())
    network1.gossipManager.add(contentKey100001)
    assert.equal(network1.gossipManager.gossipQueues[node2.discv5.enr.nodeId].length, 1)
    network1.gossipManager.add(contentKey100002)
    assert.equal(network1.gossipManager.gossipQueues[node2.discv5.enr.nodeId].length, 0)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const res = await node2.network()['0x500b']?.findContentLocally(contentKey100001)
    assert.deepEqual(res, HWP1000001)
  })
})
