import { SignableENR } from '@chainsafe/discv5'
import { toHexString } from '@chainsafe/ssz'
import { bytesToHex, concatBytes, hexToBytes, randomBytes } from '@ethereumjs/util'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import { genesisData } from '@lodestar/config/networks'
import { ssz } from '@lodestar/types'
import { multiaddr } from '@multiformats/multiaddr'
import { createRequire } from 'module'
import { assert, describe, expect, it, vi } from 'vitest'

import { NetworkId, PortalNetwork, TransportLayer } from '../../../src/index.js'
import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
} from '../../../src/networks/beacon/types.js'

import type { BeaconLightClientNetwork } from '../../../src/networks/beacon/index.js'

const require = createRequire(import.meta.url)

const specTestVectors = require('./specTestVectors.json')
const config = createBeaconConfig(
  defaultChainConfig,
  hexToBytes(genesisData.mainnet.genesisValidatorsRoot),
)

describe('portal network spec test vectors', () => {
  const serializedOptimistincUpdate = hexToBytes(
    specTestVectors.optimisticUpdate['6718463'].content_value,
  )
  const serializedOptimistincUpdateKey = hexToBytes(
    specTestVectors.optimisticUpdate['6718463'].content_key,
  )
  const forkDigest = ssz.ForkDigest.deserialize(serializedOptimistincUpdate.slice(0, 4))

  it('forkDigest2ForkName', () => {
    assert.equal(config.forkDigest2ForkName(forkDigest), 'capella', 'derived correct fork')
  })

  const deserializedOptimisticUpdate = ssz.capella.LightClientOptimisticUpdate.deserialize(
    serializedOptimistincUpdate.slice(4),
  )
  const optimisticUpdateKey = LightClientOptimisticUpdateKey.deserialize(
    serializedOptimistincUpdateKey.slice(1),
  )

  it('deserializes optimistic update', () => {
    assert.equal(
      deserializedOptimisticUpdate.attestedHeader.beacon.slot,
      6718463,
      'deserialized optimistic update',
    )
  })

  it('deserializes optimistic update key', () => {
    assert.equal(
      optimisticUpdateKey.signatureSlot,
      6718464n,
      'correctly deserialized optimistic update key',
    )
  })

  const finalityUpdate = hexToBytes(specTestVectors.finalityUpdate['6718368'].content_value)
  const finalityUpdateKey = hexToBytes(specTestVectors.finalityUpdate['6718368'].content_key).slice(
    1,
  )
  const deserializedFinalityUpdate = ssz.capella.LightClientFinalityUpdate.deserialize(
    finalityUpdate.slice(4),
  )

  it('deserializes finality update', () => {
    assert.equal(
      deserializedFinalityUpdate.attestedHeader.beacon.slot,
      6718463,
      'deserialized finality update',
    )
  })

  it('deserializes finality update key', () => {
    assert.equal(
      LightClientFinalityUpdateKey.deserialize(finalityUpdateKey).finalitySlot,
      6718368n,
      'deserialized finality update key',
    )
  })
  const bootstrap = specTestVectors.bootstrap['6718368']
  const deserializedBootstrap = ssz.capella.LightClientBootstrap.deserialize(
    hexToBytes(bootstrap.content_value).slice(4),
  )
  const bootstrapKey = hexToBytes(bootstrap.content_key).slice(1)
  it('deserializes bootstrap', () => {
    assert.equal(deserializedBootstrap.header.beacon.slot, 6718368, 'deserialized bootstrap')
  })

  it('deserializes bootstrap key', () => {
    assert.equal(
      toHexString(LightClientBootstrapKey.deserialize(bootstrapKey).blockHash),
      '0xbd9f42d9a42d972bdaf4dee84e5b419dd432b52867258acb7bcc7f567b6e3af1',
      'deserialized light client bootstrap key',
    )
  })
  const updateByRange = hexToBytes(specTestVectors.updateByRange['6684738'].content_value)
  const updateByRangeKey = hexToBytes(specTestVectors.updateByRange['6684738'].content_key).slice(1)
  const deserializedRange = LightClientUpdatesByRange.deserialize(updateByRange)

  let numUpdatesDeserialized = 0
  for (const update of deserializedRange) {
    const forkdigest = update.slice(0, 4)
    const forkname = config.forkDigest2ForkName(forkdigest)
    //@ts-ignore - typescript won't let me set `forkname` to a value from of the Forks type
    ssz[forkname].LightClientUpdate.deserialize(update.slice(4)).attestedHeader.beacon.slot
    numUpdatesDeserialized++
  }
  it('deserializes update by range', () => {
    assert.equal(numUpdatesDeserialized, 4, 'deserialized LightClientUpdatesByRange')
  })

  it('deserializes update by range key', () => {
    assert.equal(
      LightClientUpdatesByRangeKey.deserialize(updateByRangeKey).count,
      4n,
      'deserialized update by range key',
    )
  })
})

describe('API tests', async () => {
  const privateKeys = [
    '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  ]
  const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)

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

  const network = <BeaconLightClientNetwork>node1.networks.get(NetworkId.BeaconLightClientNetwork)

  it('stores and retrieves bootstrap', async () => {
    const bootstrap = specTestVectors.bootstrap['6718368']

    await network.store(
      BeaconLightClientNetworkContentType.LightClientBootstrap,
      bootstrap.content_key,
      hexToBytes(bootstrap.content_value),
    )
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
      BeaconLightClientNetworkContentType.LightClientFinalityUpdate,
      finalityUpdate.content_key,
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
      BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
      optimisticUpdate.content_key,
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
    await network.store(
      BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
      updatesByRange.content_key,
      hexToBytes(updatesByRange.content_value),
    )

    const reconstructedRange = await network['constructLightClientRange'](
      hexToBytes(updatesByRange.content_key).slice(1),
    )
    assert.equal(
      toHexString(reconstructedRange).slice(0, 20),
      updatesByRange.content_value.slice(0, 20),
      'stored and reconstructed a LightClientUpdatesByRange object',
    )
  })
})

describe('constructor/initialization tests', async () => {
  const privateKeys = [
    '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  ]
  const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)

  it('starts the bootstrap finder mechanism when no trusted block root is provided', async () => {
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
    const beacon = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const listeners = beacon.portal.listeners('NodeAdded')
    assert.equal(listeners.length, 1, 'bootstrap vote listener is running')
    assert.equal(listeners[0], beacon['getBootStrapVote'])
  })

  it('starts with a sync strategy of `trustedBootStrap` when a trusted block root is provided', async () => {
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
      trustedBlockRoot: bytesToHex(randomBytes(32)),
    })
    const beacon = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    const listeners = beacon.portal.listeners('NodeAdded')
    assert.equal(listeners.length, 1, 'bootstrap listener is running')
    assert.equal(listeners[0], beacon['getBootstrap'])
  })

  it('initializes the light client `initializeLightClient` is provided', async () => {
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
      supportedNetworks: [NetworkId.BeaconLightClientNetwork],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        peerId: id1,
      },
      trustedBlockRoot,
    })
    const beacon = node1.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork

    await beacon.initializeLightClient(trustedBlockRoot)
    assert.equal((beacon.lightClient as any).checkpointRoot, trustedBlockRoot)
    expect(beacon.lightClient!.start).toHaveBeenCalled()
    const listeners = beacon.portal.listeners('NodeAdded')

    assert.equal(listeners.length, 0, 'bootstrap listener is not running')
    vi.resetAllMocks()
  })
})
