import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { describe, it, assert } from 'vitest'
import {
  fromHexString,
  PortalNetwork,
  ProtocolId,
  TransportLayer,
  BeaconLightClientNetwork,
  BeaconLightClientNetworkContentType,
  toHexString,
} from '../../src/index.js'
import { createRequire } from 'module'

import { SignableENR } from '@chainsafe/discv5'

const require = createRequire(import.meta.url)

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

const specTestVectors = require('../subprotocols/beacon/specTestVectors.json')

it('Find Content tests', async () => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.BeaconLightClientNetwork],
    config: {
      enr: enr1,
      bindAddrs: {
        ip4: initMa,
      },
      peerId: id1,
    },
  })
  const node2 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.BeaconLightClientNetwork],
    config: {
      enr: enr2,
      bindAddrs: {
        ip4: initMa2,
      },
      peerId: id2,
    },
  })

  await node1.start()
  await node2.start()
  const protocol1 = node1.protocols.get(
    ProtocolId.BeaconLightClientNetwork,
  ) as BeaconLightClientNetwork
  const protocol2 = node2.protocols.get(
    ProtocolId.BeaconLightClientNetwork,
  ) as BeaconLightClientNetwork
  await protocol1!.sendPing(protocol2?.enr!.toENR())
  assert.equal(
    protocol1?.routingTable.getWithPending(
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
    )?.value.nodeId,
    '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
    'node1 added node2 to routing table',
  )

  const bootstrap = specTestVectors.bootstrap['6718368']

  await protocol1.store(
    BeaconLightClientNetworkContentType.LightClientBootstrap,
    bootstrap.content_key,
    fromHexString(bootstrap.content_value),
  )
  await new Promise((resolve) => {
    node2.uTP.on('Stream', async () => {
      const content = await protocol2.findContentLocally(fromHexString(bootstrap.content_key))
      assert.notOk(content === undefined, 'should retrieve content for bootstrap key')
      assert.equal(
        toHexString(content!),
        bootstrap.content_value,
        'retrieved correct content for bootstrap',
      )
      await node1.stop()
      await node2.stop()
      resolve(undefined)
    })
    protocol2.sendFindContent(node1.discv5.enr.nodeId, fromHexString(bootstrap.content_key))
  })

  // TODO: Add tests for other content types
})
