import { describe, it, assert } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { ssz } from '@lodestar/types'

import {
  BeaconLightClientNetworkContentType,
  LightClientUpdatesByRange,
} from '../../../src/subprotocols/beacon/types.js'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { SignableENR } from '@chainsafe/discv5'
import { multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, ProtocolId, TransportLayer } from '../../../src/index.js'
import type { BeaconLightClientNetwork } from '../../../src/subprotocols/beacon/index.js'

const specTestVectors = require('./specTestVectors.json')

describe('Beacon subclass API tests', async () => {
  const privateKeys = [
    '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  ]
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)

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

  const protocol = <BeaconLightClientNetwork>(
    node1.protocols.get(ProtocolId.BeaconLightClientNetwork)
  )

  it('stores and retrieves bootstrap', async () => {
    const bootstrap = specTestVectors.bootstrap['6718368']

    await protocol.store(
      BeaconLightClientNetworkContentType.LightClientBootstrap,
      bootstrap.content_key,
      fromHexString(bootstrap.content_value),
    )
    const retrievedBootstrap = await protocol.findContentLocally(
      fromHexString(bootstrap.content_key),
    )

    assert.equal(
      ssz.capella.LightClientBootstrap.deserialize(retrievedBootstrap!.slice(4)).header.beacon.slot,
      ssz.capella.LightClientBootstrap.deserialize(fromHexString(bootstrap.content_value).slice(4))
        .header.beacon.slot,
      'successfully stored and retrieved bootstrap',
    )
  })

  it('stores and retrieves finality update', async () => {
    const finalityUpdate = specTestVectors.finalityUpdate['6718463']
    await protocol.store(
      BeaconLightClientNetworkContentType.LightClientFinalityUpdate,
      finalityUpdate.content_key,
      fromHexString(finalityUpdate.content_value),
    )
    const retrievedFinalityUpdate = await protocol.findContentLocally(
      fromHexString(finalityUpdate.content_key),
    )

    assert.equal(
      ssz.capella.LightClientFinalityUpdate.deserialize(retrievedFinalityUpdate!.slice(4))
        .attestedHeader.beacon.slot,
      ssz.capella.LightClientFinalityUpdate.deserialize(
        fromHexString(finalityUpdate.content_value).slice(4),
      ).attestedHeader.beacon.slot,
      'successfully stored and retrieved finality update',
    )
  })

  it('stores and retrieves optimistic update', async () => {
    const optimisticUpdate = specTestVectors.optimisticUpdate['6718463']
    await protocol.store(
      BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
      optimisticUpdate.content_key,
      fromHexString(optimisticUpdate.content_value),
    )
    const retrievedOptimisticUpdate = await protocol.findContentLocally(
      fromHexString(optimisticUpdate.content_key),
    )

    assert.equal(
      ssz.capella.LightClientOptimisticUpdate.deserialize(retrievedOptimisticUpdate!.slice(4))
        .attestedHeader.beacon.slot,
      ssz.capella.LightClientOptimisticUpdate.deserialize(
        fromHexString(optimisticUpdate.content_value).slice(4),
      ).attestedHeader.beacon.slot,
      'successfully stored and retrieved optimistic update',
    )
  })

  it('stores a LightClientUpdate locally', async () => {
    const updatesByRange = specTestVectors.updateByRange['6684738']
    await protocol.storeUpdateRange(fromHexString(updatesByRange.content_value))
    const storedUpdate = await protocol.findContentLocally(fromHexString('0x040330'))
    const deserializedUpdate = ssz.capella.LightClientUpdate.deserialize(storedUpdate!.slice(4))
    assert.equal(
      deserializedUpdate.attestedHeader.beacon.slot,
      6684738,
      'retrieved a single light client update by period number from db',
    )

    const range = await protocol.findContentLocally(fromHexString(updatesByRange.content_key))
    const retrievedRange = await LightClientUpdatesByRange.deserialize(range!)
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
    await protocol.store(
      BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
      updatesByRange.content_key,
      fromHexString(updatesByRange.content_value),
    )

    const reconstructedRange = await protocol['constructLightClientRange'](
      fromHexString(updatesByRange.content_key).slice(1),
    )
    assert.equal(
      toHexString(reconstructedRange).slice(0, 20),
      updatesByRange.content_value.slice(0, 20),
      'stored and reconstructed a LightClientUpdatesByRange object',
    )
  })
})
