import { SignableENR } from '@chainsafe/enr'
import { toHexString } from '@chainsafe/ssz'
import { bytesToHex, concatBytes, hexToBytes, randomBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { ssz } from '@lodestar/types'
import { multiaddr } from '@multiformats/multiaddr'
import { createRequire } from 'module'
import { assert, describe, expect, it, vi } from 'vitest'

import {
  NetworkId,
  PortalNetwork,
  TransportLayer,
  getBeaconContentKey,
} from '../../../src/index.js'
import {
  BeaconLightClientNetworkContentType,
  HistoricalSummariesKey,
  HistoricalSummariesWithProof,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
} from '../../../src/networks/beacon/types.js'

import type { BeaconLightClientNetwork } from '../../../src/networks/beacon/index.js'

const require = createRequire(import.meta.url)

const specTestVectors = require('./specTestVectors.json')
const privateKeys = ['0x08021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd']
const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]))
const enr1 = SignableENR.createFromPrivateKey(pk1)
describe('API tests', async () => {
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)

  const node1 = await PortalNetwork.create({
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

  const network = <BeaconLightClientNetwork>node1.networks.get(NetworkId.BeaconChainNetwork)

  it('stores and retrieves bootstrap', async () => {
    const bootstrap = specTestVectors.bootstrap['6718368']

    await network.store(bootstrap.content_key, hexToBytes(bootstrap.content_value))
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
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientFinalityUpdate]),
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
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientOptimisticUpdate]),
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
    assert.equal(toHexString(range!), updatesByRange.content_value)
  })

  it('stores and retrieves a batch of LightClientUpdates', async () => {
    const updatesByRange = specTestVectors.updateByRange['6684738']
    await network.store(updatesByRange.content_key, hexToBytes(updatesByRange.content_value))

    const reconstructedRange = await network['constructLightClientRange'](
      hexToBytes(updatesByRange.content_key).slice(1),
    )
    assert.equal(
      toHexString(reconstructedRange).slice(0, 20),
      updatesByRange.content_value.slice(0, 20),
      'stored and reconstructed a LightClientUpdatesByRange object',
    )
  })

  it('stores and retrieves a HistoricalSummariesWithProof object', async () => {
    const summariesProofJson = (
      await import('./testData/historicalSummariesProof_slot_9583072.json')
    ).default
    const summariesJson = (await import('./testData/historicalSummaries_slot_9583072.json')).default
    const historicalSummaries =
      ssz.deneb.BeaconState.fields.historicalSummaries.fromJson(summariesJson)
    const finalityUpdateJson = (
      await import('./testData/lightClientFinalityUpdate_slot_9583072.json')
    ).data
    const finalizedHeader = ssz.altair.LightClientFinalityUpdate.fromJson(finalityUpdateJson)
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
      BeaconLightClientNetworkContentType.HistoricalSummaries,
      HistoricalSummariesKey.serialize({
        epoch,
      }),
    )

    await network.store(
      historicalSummariesKey,
      HistoricalSummariesWithProof.serialize({
        epoch,
        historicalSummaries,
        proof: summariesProofJson.map((el) => hexToBytes(el)),
      }),
    )
    const res = HistoricalSummariesWithProof.deserialize(
      (await network.findContentLocally(historicalSummariesKey)) as Uint8Array,
    )
    assert.equal(res.epoch, 1169n)
  })
})

describe('constructor/initialization tests', async () => {
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)

  it('starts the bootstrap finder mechanism when no trusted block root is provided', async () => {
    const node1 = await PortalNetwork.create({
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
    const beacon = node1.networks.get(NetworkId.BeaconChainNetwork) as BeaconLightClientNetwork
    const listeners = beacon.portal.listeners('NodeAdded')
    assert.equal(listeners.length, 1, 'bootstrap vote listener is running')
    assert.equal(listeners[0], beacon['getBootStrapVote'])
  })

  it('starts with a sync strategy of `trustedBootStrap` when a trusted block root is provided', async () => {
    const node1 = await PortalNetwork.create({
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
    const beacon = node1.networks.get(NetworkId.BeaconChainNetwork) as BeaconLightClientNetwork
    const listeners = beacon.portal.listeners('NodeAdded')
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
    const node1 = await PortalNetwork.create({
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
    const beacon = node1.networks.get(NetworkId.BeaconChainNetwork) as BeaconLightClientNetwork

    await beacon.initializeLightClient(trustedBlockRoot)
    assert.equal((beacon.lightClient as any).checkpointRoot, trustedBlockRoot)
    expect(beacon.lightClient!.start).toHaveBeenCalled()
    const listeners = beacon.portal.listeners('NodeAdded')

    assert.equal(listeners.length, 0, 'bootstrap listener is not running')
    vi.resetAllMocks()
  })
})
