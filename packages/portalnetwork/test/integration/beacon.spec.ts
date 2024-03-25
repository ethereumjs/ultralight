import { SignableENR } from '@chainsafe/discv5'
import { concatBytes, hexToBytes, intToHex } from '@ethereumjs/util'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { RunStatusCode } from '@lodestar/light-client'
import { computeSyncPeriodAtSlot } from '@lodestar/light-client/utils'
import { ForkName } from '@lodestar/params'
import { ssz } from '@lodestar/types'
import { multiaddr } from '@multiformats/multiaddr'
import { createRequire } from 'module'
import { assert, describe, it, vi } from 'vitest'

import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  getBeaconContentKey,
  toHexString,
} from '../../src/index.js'

import type { BeaconLightClientNetwork } from '../../src/index.js'

const require = createRequire(import.meta.url)

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

const specTestVectors = require('../networks/beacon/specTestVectors.json')

describe('Find Content tests', () => {
  it('should find bootstrap content', async () => {
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
    const network1 = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const network2 = node2.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    await network1!.sendPing(network2?.enr!.toENR())
    assert.equal(
      network1?.routingTable.getWithPending(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      )?.value.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table',
    )

    const bootstrap = specTestVectors.bootstrap['6718368']

    await network1.store(
      BeaconLightClientNetworkContentType.LightClientBootstrap,
      bootstrap.content_key,
      hexToBytes(bootstrap.content_value),
    )
    await new Promise((resolve) => {
      node2.uTP.on(NetworkId.BeaconLightClientNetwork, async () => {
        const content = await network2.findContentLocally(hexToBytes(bootstrap.content_key))
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
      void network2.sendFindContent(node1.discv5.enr.nodeId, hexToBytes(bootstrap.content_key))
    })
  })
  it('should find optimistic update', async () => {
    const optimisticUpdate = specTestVectors.optimisticUpdate['6718463']
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3002`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3003`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
    const network1 = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const network2 = node2.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork

    // Stub out light client
    network1.lightClient = {
      //@ts-ignore
      getHead: () => {
        return {
          beacon: {
            slot: 6718462,
          },
        }
      },
    }
    network2.lightClient = {
      //@ts-ignore
      getHead: () => {
        return {
          beacon: {
            slot: 6718462,
          },
        }
      },
    }

    await network1!.sendPing(network2?.enr!.toENR())
    assert.equal(
      network1?.routingTable.getWithPending(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      )?.value.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table',
    )
    await network1.store(
      BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
      optimisticUpdate.content_key,
      hexToBytes(optimisticUpdate.content_value),
    )
    const res = await network2.sendFindContent(
      node1.discv5.enr.nodeId,
      concatBytes(
        new Uint8Array([0x13]),
        LightClientOptimisticUpdateKey.serialize({ signatureSlot: 6718463n }),
      ),
    )
    assert.equal(
      toHexString(res!.value as Uint8Array),
      optimisticUpdate.content_value,
      'retrieved content for optimistic update from network',
    )
    const content = await network2.findContentLocally(
      concatBytes(
        new Uint8Array([0x13]),
        LightClientOptimisticUpdateKey.serialize({ signatureSlot: 6718463n }),
      ),
    )

    assert.notOk(content === undefined, 'should retrieve content for optimistic update key')
    assert.equal(
      toHexString(content!),
      optimisticUpdate.content_value,
      'retrieved correct content for optimistic update from local storage',
    )
    await node1.stop()
    await node2.stop()
  }, 15000)

  it('should find LightClientUpdatesByRange update', async () => {
    const updatesByRange = specTestVectors.updateByRange['6684738']
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3004`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3005`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
    const network1 = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const network2 = node2.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    await network1!.sendPing(network2?.enr!.toENR())
    assert.equal(
      network1?.routingTable.getWithPending(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      )?.value.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table',
    )
    await network1.storeUpdateRange(hexToBytes(updatesByRange.content_value))

    const res = await network2.sendFindContent(
      node1.discv5.enr.nodeId,
      hexToBytes(updatesByRange.content_key),
    )

    assert.equal(
      toHexString(res!.value as Uint8Array),
      updatesByRange.content_value,
      'retrieved content for light client updates by range from network',
    )
    const content = await network2.findContentLocally(hexToBytes(updatesByRange.content_key))
    assert.notOk(
      content === undefined,
      'should retrieve content for Light Client Update by Range key',
    )
    assert.equal(
      toHexString(content!),
      updatesByRange.content_value,
      'retrieved correct content for Light Client Update by Range from local storage',
    )
    await node1.stop()
    await node2.stop()
  }, 10000)
})

describe('OFFER/ACCEPT tests', () => {
  it('offers optimistic updates to another node', async () => {
    const optimisticUpdate = specTestVectors.optimisticUpdate['6718463']
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/30022`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/30023`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
      config: {
        enr: enr2,
        bindAddrs: {
          ip4: initMa2,
        },
        peerId: id2,
      },
    })

    node1.enableLog('*BeaconLightClientNetwork*')
    node2.enableLog('*BeaconLightClientNetwork')
    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const network2 = node2.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork

    // Stub out light client and set the light client's head slot value to equal our optimistic update slot
    network1.lightClient = {
      //@ts-ignore
      getHead: () => {
        return {
          beacon: {
            slot: 6718462,
          },
        }
      },
    }

    // We set the light client's stubbed head slot to node1's light client's head minus 1
    network2.lightClient = {
      //@ts-ignore
      getHead: () => {
        return {
          beacon: {
            slot: 6718461,
          },
        }
      },
    }

    await network1!.sendPing(network2?.enr!.toENR())
    assert.equal(
      network1?.routingTable.getWithPending(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      )?.value.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table',
    )
    await network1.store(
      BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
      getBeaconContentKey(
        BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
        LightClientOptimisticUpdateKey.serialize({ signatureSlot: 6718463n }),
      ),
      hexToBytes(optimisticUpdate.content_value),
    )

    await new Promise((resolve) => {
      network2.on('ContentAdded', (contentKey, contentType) => {
        if (contentType === BeaconLightClientNetworkContentType.LightClientOptimisticUpdate)
          // Update the light client stub to report the new "optimistic head"
          network2.lightClient = {
            //@ts-ignore
            getHead: () => {
              return {
                beacon: {
                  slot: 6718462,
                },
              }
            },
          }
        resolve(undefined)
      })
    })
    const content = await network2.findContentLocally(
      hexToBytes(
        getBeaconContentKey(
          BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
          LightClientOptimisticUpdateKey.serialize({ signatureSlot: 6718463n }),
        ),
      ),
    )

    assert.notOk(content === undefined, 'should retrieve content for optimistic update key')
    assert.equal(
      toHexString(content!),
      optimisticUpdate.content_value,
      'retrieved correct content for optimistic update from local storage',
    )
    await node1.stop()
    await node2.stop()
  }, 10000)
  it('offers a stale optimistic update to another node that is declined', async () => {
    const optimisticUpdate = specTestVectors.optimisticUpdate['6718463']
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/30025`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/30026`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
    const network1 = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const network2 = node2.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork

    // Stub out light client and set the light client's head slot value to equal our optimistic update slot
    network1.lightClient = {
      //@ts-ignore
      getHead: () => {
        return {
          beacon: {
            slot: 6718463,
          },
        }
      },
    }

    // We set the light client's stubbed head slot to node1's light client's head + 1
    network2.lightClient = {
      //@ts-ignore
      getHead: () => {
        return {
          beacon: {
            slot: 6718464,
          },
        }
      },
    }

    await network1!.sendPing(network2?.enr!.toENR())
    assert.equal(
      network1?.routingTable.getWithPending(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      )?.value.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table',
    )

    const staleOptimisticUpdateContentKey = getBeaconContentKey(
      BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
      LightClientOptimisticUpdateKey.serialize({ signatureSlot: 6718463n }),
    )
    await network1.store(
      BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
      staleOptimisticUpdateContentKey,
      hexToBytes(optimisticUpdate.content_value),
    )

    const acceptedOffers = await network1.sendOffer(network2.enr.nodeId, [
      hexToBytes(staleOptimisticUpdateContentKey),
    ])
    assert.equal(acceptedOffers, undefined, 'no content was accepted by node 2')
    const content = await network2.retrieve(
      intToHex(BeaconLightClientNetworkContentType.LightClientOptimisticUpdate),
    )

    assert.equal(content, undefined, 'should not retrieve content for stale optimistic update key')

    await node1.stop()
    await node2.stop()
  }, 10000)

  it('gossips a bootstrap to another node', async () => {
    const bootstrapJson = require('./testdata/bootstrap2.json').data
    const bootstrap = ssz.capella.LightClientBootstrap.fromJson(bootstrapJson)
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/30025`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/30026`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
    const network1 = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const network2 = node2.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork

    await network1!.sendPing(network2?.enr!.toENR())

    const bootstrapKey = getBeaconContentKey(
      BeaconLightClientNetworkContentType.LightClientBootstrap,
      LightClientBootstrapKey.serialize({
        blockHash: ssz.phase0.BeaconBlockHeader.hashTreeRoot(bootstrap.header.beacon),
      }),
    )
    await network1.store(
      BeaconLightClientNetworkContentType.LightClientBootstrap,
      bootstrapKey,
      concatBytes(
        network1.beaconConfig.forkName2ForkDigest(ForkName.capella),
        ssz.capella.LightClientBootstrap.serialize(bootstrap),
      ),
    )

    await network1.sendOffer(network2.enr.nodeId, [hexToBytes(bootstrapKey)])

    await new Promise((resolve) => {
      network2.on('ContentAdded', (key) => {
        assert.equal(key, bootstrapKey, 'successfully gossipped bootstrap')
        resolve(undefined)
      })
    })
    await node1.stop()
    await node2.stop()
  }, 20000)
})

describe('beacon light client sync tests', () => {
  it('should sync the lightclient to current sync period', async () => {
    await import('@lodestar/light-client')
    /**
     * This test simulates the syncing process for a Lodestar light client using only data seeded from the portal network.  Below are the steps:
     * 1) Store a LightClientBootstrap corresponding to sync period 879 and block root 0x3e733d7db0b70c17a00c125da9cce68cbdb8135c4400afedd88c17f11a3e3b7b in client 1.
     * 2) Store Light Client Updates corresponding to sync periods 879, 880, and 881 in client 1.
     * 3) Store a LightClientOptimisticUpdate corresponding to sync period 881 in client 1.
     * 4) Initialize the Lodestar light client in client 2 using trusted block root 0x3e733d7db0b70c17a00c125da9cce68cbdb8135c4400afedd88c17f11a3e3b7b.
     * 5) The light client will use the Ultralight Transport to request the bootstrap and then the light client update range for the 3 periods, validate them,
     * and then get the latest optimistic update which brings it to the head of the chain.
     */
    vi.useFakeTimers({ shouldAdvanceTime: true, shouldClearNativeTimers: true })
    vi.setSystemTime(1693431998000)
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/31824`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/31825`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
    const network1 = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const network2 = node2.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork

    const bootstrapJSON = require('./testdata/bootstrap.json').data
    const bootstrap = ssz.capella.LightClientBootstrap.fromJson(bootstrapJSON)
    const range = require('./testdata/lcUpdateRange.json')
    const capellaForkDigest = network1.beaconConfig.forkName2ForkDigest(ForkName.capella)
    const update1 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[0].data),
      ),
    )
    const update2 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[1].data),
      ),
    )
    const update3 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[2].data),
      ),
    )

    const optimisticUpdateJson = require('./testdata/optimisticUpdate.json')
    const optimisticUpdate = ssz.capella.LightClientOptimisticUpdate.fromJson(optimisticUpdateJson)

    await network1.store(
      BeaconLightClientNetworkContentType.LightClientBootstrap,
      getBeaconContentKey(
        BeaconLightClientNetworkContentType.LightClientBootstrap,
        LightClientBootstrapKey.serialize({
          blockHash: ssz.phase0.BeaconBlockHeader.hashTreeRoot(bootstrap.header.beacon),
        }),
      ),
      concatBytes(capellaForkDigest, ssz.capella.LightClientBootstrap.serialize(bootstrap)),
    )

    const updatesByRange = LightClientUpdatesByRange.serialize([update1, update2, update3])

    await network1.storeUpdateRange(updatesByRange)

    await network1.store(
      BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
      getBeaconContentKey(
        BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
        LightClientOptimisticUpdateKey.serialize({
          signatureSlot: BigInt(optimisticUpdate.signatureSlot),
        }),
      ),
      concatBytes(
        capellaForkDigest,
        ssz.capella.LightClientOptimisticUpdate.serialize(optimisticUpdate),
      ),
    )

    await network1!.sendPing(network2?.enr!.toENR())
    assert.equal(
      network1?.routingTable.getWithPending(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      )?.value.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table',
    )

    await network2.initializeLightClient(
      '0x3e733d7db0b70c17a00c125da9cce68cbdb8135c4400afedd88c17f11a3e3b7b',
    )

    void network2.lightClient?.start()

    while (network2.lightClient?.status !== RunStatusCode.started) {
      await new Promise((r) => setTimeout(r, 1000))
    }
    assert.equal(
      network2.lightClient.status,
      RunStatusCode.started,
      'light client synced to latest epoch successfully',
    )

    network2.lightClient.stop()
    await node1.stop()
    await node2.stop()
  }, 30000)

  it.skip('finds a bootstrap using peer voting', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, shouldClearNativeTimers: true })
    vi.setSystemTime(1694217167000)
    const range = require('./testdata/range.json')
    const bootstrapJson = require('./testdata/bootstrap2.json').data
    const bootstrap = ssz.capella.LightClientBootstrap.fromJson(bootstrapJson)

    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/30025`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/30026`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
      config: {
        enr: enr2,
        bindAddrs: {
          ip4: initMa2,
        },
        peerId: id2,
      },
    })
    node1.enableLog('*BeaconLightClientNetwork,-uTP')
    //   node2.enableLog('*')
    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const network2 = node2.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork

    const capellaForkDigest = network1.beaconConfig.forkName2ForkDigest(ForkName.capella)

    const update1 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[0].data),
      ),
    )
    const update2 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[1].data),
      ),
    )
    const update3 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[2].data),
      ),
    )
    const update4 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[3].data),
      ),
    )

    const rangeKey = getBeaconContentKey(
      BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
      LightClientUpdatesByRangeKey.serialize({
        startPeriod: BigInt(computeSyncPeriodAtSlot(range[0].data.attested_header.beacon.slot)),
        count: 3n,
      }),
    )
    const bootstrapKey = getBeaconContentKey(
      BeaconLightClientNetworkContentType.LightClientBootstrap,
      LightClientBootstrapKey.serialize({
        blockHash: ssz.phase0.BeaconBlockHeader.hashTreeRoot(bootstrap.header.beacon),
      }),
    )
    await network1.store(
      BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
      rangeKey,
      LightClientUpdatesByRange.serialize([update1, update2, update3, update4]),
    )

    await network1.store(
      BeaconLightClientNetworkContentType.LightClientBootstrap,
      bootstrapKey,
      concatBytes(
        network1.beaconConfig.forkName2ForkDigest(ForkName.capella),
        ssz.capella.LightClientBootstrap.serialize(bootstrap),
      ),
    )

    await new Promise((resolve) => {
      network2.portal.on('NodeAdded', (_nodeId) => {
        if (network2['bootstrapFinder'].values.length > 0) {
          resolve('undefined)')
        }
      })
      void network2!.addBootNode(network1?.enr!.encodeTxt())
    })
  }, 30000)
})
