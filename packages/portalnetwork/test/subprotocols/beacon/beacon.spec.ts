import tape from 'tape'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { fromHexString } from '@chainsafe/ssz'
import { ssz } from '@lodestar/types'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import {
  LightClientUpdatesByRange,
  MainnetGenesisValidatorsRoot,
} from '../../../src/subprotocols/beacon/types.js'

tape('portal network spec test vectors', (t) => {
  const specTestVectors = require('./specTestVectors.json')
  const genesisRoot = fromHexString(MainnetGenesisValidatorsRoot) // Genesis Validators Root
  const serializedOptimistincUpdate = fromHexString(
    specTestVectors.optimisticUpdate['6718463'].content_value
  )
  const forkDigest = ssz.ForkDigest.deserialize(serializedOptimistincUpdate.slice(0, 4))

  const config = createBeaconConfig(defaultChainConfig, genesisRoot)
  t.equal(config.forkDigest2ForkName(forkDigest), 'capella', 'derived correct fork')
  const deserializedOptimisticUpdate = ssz.capella.LightClientOptimisticUpdate.deserialize(
    serializedOptimistincUpdate.slice(4)
  )
  t.equal(
    deserializedOptimisticUpdate.attestedHeader.beacon.slot,
    6718463,
    'deserialized optimistic update'
  )
  const finalityUpdate = fromHexString(specTestVectors.finalityUpdate['6718463'].content_value)
  const deserializedFinalityUpdate = ssz.capella.LightClientFinalityUpdate.deserialize(
    finalityUpdate.slice(4)
  )
  t.equal(
    deserializedFinalityUpdate.attestedHeader.beacon.slot,
    6718463,
    'deserialized finality update'
  )
  const bootstrap = specTestVectors.bootstrap['6718368']
  const deserializedBootstrap = ssz.capella.LightClientBootstrap.deserialize(
    fromHexString(bootstrap.content_value).slice(4)
  )
  t.equal(deserializedBootstrap.header.beacon.slot, 6718368, 'deserialized bootstrap')

  const updateByRange = fromHexString(specTestVectors.updateByRange['6684738'].content_value)
  const deserializedRange = LightClientUpdatesByRange.deserialize(updateByRange)

  let numUpdatesDeserialized = 0
  for (const update of deserializedRange) {
    const forkdigest = update.slice(0, 4)
    const forkname = config.forkDigest2ForkName(forkdigest)
    //@ts-ignore - ssz won't let me
    ssz[forkname].LightClientUpdate.deserialize(update.slice(4)).attestedHeader.beacon.slot
    numUpdatesDeserialized++
  }
  t.equal(numUpdatesDeserialized, 4, 'deserialized LightClientUpdatesByRange')
  t.end()
})