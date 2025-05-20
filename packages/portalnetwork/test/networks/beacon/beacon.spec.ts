import { createRequire } from 'module'
import { SignableENR } from '@chainsafe/enr'
import { bytesToHex, concatBytes, hexToBytes, randomBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { ssz } from '@lodestar/types'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, describe, expect, it, vi } from 'vitest'

import {
  NetworkId,
  TransportLayer,
  createPortalNetwork,
  getBeaconContentKey,
} from '../../../src/index.js'
import {
  BeaconNetworkContentType,
  HistoricalSummariesKey,
  HistoricalSummariesWithProof,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
} from '../../../src/networks/beacon/types.js'

import { ForkName } from '@lodestar/params'
import type { BeaconNetwork } from '../../../src/networks/beacon/index.js'

const require = createRequire(import.meta.url)

const specTestVectors = require('./specTestVectors.json')
const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]
const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0] as `0x${string}`).slice(-36))
const enr1 = SignableENR.createFromPrivateKey(pk1)

describe('API tests', async () => {
  const initMa: any = multiaddr('/ip4/127.0.0.1/udp/3000')
  enr1.setLocationMultiaddr(initMa)

  const node1 = await createPortalNetwork({
    transport: TransportLayer.NODE,
    supportedNetworks: [{ networkId: NetworkId.BeaconChainNetwork }],
    config: {
      enr: enr1,
      bindAddrs: {
        ip4: initMa,
      },
      privateKey: pk1,
    },
  })

  const network = <BeaconNetwork>node1.networks.get(NetworkId.BeaconChainNetwork)

  it('stores and retrieves bootstrap', async () => {
    const bootstrap = specTestVectors.bootstrap['6718368']

    await network.store(hexToBytes(bootstrap.content_key), hexToBytes(bootstrap.content_value))
    const retrievedBootstrap = await network.findContentLocally(hexToBytes(bootstrap.content_key))

    assert.equal(
      ssz.capella.LightClientBootstrap.deserialize(retrievedBootstrap!.slice(4)).header.beacon.slot,
      ssz.capella.LightClientBootstrap.deserialize(hexToBytes(bootstrap.content_value).slice(4))
        .header.beacon.slot,
      'successfully stored and retrieved bootstrap',
    )
  })

  it('stores and retrieves finality update', async () => {
    const finalityUpdate = specTestVectors.finalityUpdate['6718368']
    await network.store(
      hexToBytes(finalityUpdate.content_key),
      hexToBytes(finalityUpdate.content_value),
    )

    network.lightClient = {
      //@ts-ignore
      getFinalized: () => {
        return {
          beacon: {
            slot: 6718463,
          },
        }
      },
    }
    const retrievedFinalityUpdate = await network.findContentLocally(
      concatBytes(
        new Uint8Array([BeaconNetworkContentType.LightClientFinalityUpdate]),
        LightClientFinalityUpdateKey.serialize({ finalitySlot: 6718463n }),
      ),
    )

    assert.equal(
      ssz.capella.LightClientFinalityUpdate.deserialize(retrievedFinalityUpdate!.slice(4))
        .attestedHeader.beacon.slot,
      ssz.capella.LightClientFinalityUpdate.deserialize(
        hexToBytes(finalityUpdate.content_value).slice(4),
      ).attestedHeader.beacon.slot,
      'successfully stored and retrieved finality update',
    )
  })

  it('stores and retrieves optimistic update', async () => {
    const optimisticUpdate = specTestVectors.optimisticUpdate['6718463']
    await network.store(
      hexToBytes(optimisticUpdate.content_key),
      hexToBytes(optimisticUpdate.content_value),
    )

    network.lightClient = {
      //@ts-ignore
      getHead: () => {
        return {
          beacon: {
            slot: 6718463,
          },
        }
      },
    }
    const retrievedOptimisticUpdate = await network.findContentLocally(
      concatBytes(
        new Uint8Array([BeaconNetworkContentType.LightClientOptimisticUpdate]),
        LightClientOptimisticUpdateKey.serialize({ signatureSlot: 6718464n }),
      ),
    )

    assert.equal(
      ssz.capella.LightClientOptimisticUpdate.deserialize(retrievedOptimisticUpdate!.slice(4))
        .attestedHeader.beacon.slot,
      ssz.capella.LightClientOptimisticUpdate.deserialize(
        hexToBytes(optimisticUpdate.content_value).slice(4),
      ).attestedHeader.beacon.slot,
      'successfully stored and retrieved optimistic update',
    )
  })

  it('stores a LightClientUpdate locally', async () => {
    const gossipSpy = vi.spyOn(network, 'sendOffer')
    const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1] as `0x${string}`).slice(-36))
    const enr2 = SignableENR.createFromPrivateKey(pk2)
    const initMa2 = multiaddr('/ip4/127.0.0.1/udp/3001')
    enr2.setLocationMultiaddr(initMa2)
    const node2 = await createPortalNetwork({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.BeaconChainNetwork }],
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
    await network.addBootNode(enr2.encodeTxt())

    const updatesByRange = specTestVectors.updateByRange['6684738']
    await network.storeUpdateRange(hexToBytes(updatesByRange.content_value))
    const storedUpdate = await network.findContentLocally(hexToBytes('0x150330'))
    const deserializedUpdate = ssz.capella.LightClientUpdate.deserialize(storedUpdate!.slice(4))
    assert.equal(
      deserializedUpdate.attestedHeader.beacon.slot,
      6684738,
      'retrieved a single light client update by period number from db',
    )

    const range = await network.findContentLocally(hexToBytes(updatesByRange.content_key))
    const retrievedRange = LightClientUpdatesByRange.deserialize(range!)
    const update1 = ssz.capella.LightClientUpdate.deserialize(retrievedRange[0].slice(4))
    assert.equal(
      update1.attestedHeader.beacon.slot,
      6684738,
      'put the correct update in the correct position in the range',
    )
    assert.equal(bytesToHex(range!), updatesByRange.content_value)
    expect(gossipSpy).toHaveBeenCalledTimes(0) // verifies that we don't gossip individual LightClientUpdates
    vi.clearAllMocks()
  })

  it('stores and retrieves a batch of LightClientUpdates', async () => {
    const updatesByRange = specTestVectors.updateByRange['6684738']
    await network.store(
      hexToBytes(updatesByRange.content_key),
      hexToBytes(updatesByRange.content_value),
    )

    const reconstructedRange = await network['constructLightClientRange'](
      hexToBytes(updatesByRange.content_key).slice(1),
    )
    assert.equal(
      bytesToHex(reconstructedRange).slice(0, 20),
      updatesByRange.content_value.slice(0, 20),
      'stored and reconstructed a LightClientUpdatesByRange object',
    )
  })

  it('stores and retrieves a HistoricalSummariesWithProof object', async () => {
    const summariesJson = (await import('./testData/historicalSummaries_slot11708128.json'))
    const historicalSummaries =
      ssz.electra.BeaconState.fields.historicalSummaries.fromJson(summariesJson.data.historical_summaries)
    const finalityUpdateJson = (
      await import('./testData/finalityUpdate_slot11708128.json')
    ).data
    const finalizedHeader = ssz.electra.LightClientFinalityUpdate.fromJson(finalityUpdateJson)
    // stub out lightclient to return finalized header we want
    network.lightClient = {
      //@ts-ignore
      getFinalized: () => {
        return {
          beacon: {
            slot: finalizedHeader.finalizedHeader.beacon.slot,
            stateRoot: finalizedHeader.finalizedHeader.beacon.stateRoot,
          },
        }
      },
    }
    const epoch = BigInt(finalityUpdateJson.finalized_header.beacon.slot) / 8192n
    const historicalSummariesKey = getBeaconContentKey(
      BeaconNetworkContentType.HistoricalSummaries,
      HistoricalSummariesKey.serialize({
        epoch,
      }),
    )

    await network.store(
      historicalSummariesKey,
      concatBytes(
        network.beaconConfig.forkName2ForkDigest(ForkName.electra),
        HistoricalSummariesWithProof.serialize({
          epoch,
          historicalSummaries,
          proof: summariesJson.data.proof.map((el) => hexToBytes(el as `0x${string}`)),
        }),
      ),
    )
    const res = HistoricalSummariesWithProof.deserialize(
      ((await network.findContentLocally(historicalSummariesKey)) as Uint8Array).slice(4),
    )
    assert.equal(res.epoch, 1429n)
  })
})

describe('constructor/initialization tests', async () => {
  const initMa: any = multiaddr('/ip4/127.0.0.1/udp/3000')
  enr1.setLocationMultiaddr(initMa)

  it('starts the bootstrap finder mechanism when no trusted block root is provided', async () => {
    const node1 = await createPortalNetwork({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.BeaconChainNetwork }],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        privateKey: pk1,
      },
    })
    const beacon = node1.networks.get(NetworkId.BeaconChainNetwork) as BeaconNetwork
    const listeners = beacon.portal.listeners(`${beacon.networkId}:NodeAdded`)
    assert.equal(listeners.length, 1, 'bootstrap vote listener is running')
    assert.equal(listeners[0], beacon['getBootStrapVote'])
  })

  it('starts with a sync strategy of `trustedBootStrap` when a trusted block root is provided', async () => {
    const node1 = await createPortalNetwork({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.BeaconChainNetwork }],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        privateKey: pk1,
      },
      trustedBlockRoot: bytesToHex(randomBytes(32)),
    })
    const beacon = node1.networks.get(NetworkId.BeaconChainNetwork) as BeaconNetwork
    const listeners = beacon.portal.listeners(`${beacon.networkId}:NodeAdded`)
    assert.equal(listeners.length, 1, 'bootstrap listener is running')
    assert.equal(listeners[0], beacon['getBootstrap'])
  })

  it('initializes the light client when `trustedBlockRoot` is provided', async () => {
    vi.mock('@lodestar/light-client', () => {
      return {
        Lightclient: {
          initializeFromCheckpointRoot: vi.fn().mockImplementation((args: any) => {
            const root = bytesToHex(args.checkpointRoot)
            return {
              checkpointRoot: root,
              start: vi.fn(),
            }
          }),
        },
      }
    })
    await import('@lodestar/light-client')
    const trustedBlockRoot = '0x8e4fc820d749f9cf352d074f784071f65483ea673d8e9b8188870e950125a582'
    const node1 = await createPortalNetwork({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.BeaconChainNetwork }],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        privateKey: pk1,
      },
      trustedBlockRoot,
    })
    const beacon = node1.networks.get(NetworkId.BeaconChainNetwork) as BeaconNetwork

    await beacon.initializeLightClient(trustedBlockRoot)
    assert.equal((beacon.lightClient as any).checkpointRoot, trustedBlockRoot)
    expect(beacon.lightClient!.start).toHaveBeenCalled()
    const listeners = beacon.portal.listeners(`${beacon.networkId}:NodeAdded`)

    assert.equal(listeners.length, 0, 'bootstrap listener is not running')
    vi.resetAllMocks()
  })
})
