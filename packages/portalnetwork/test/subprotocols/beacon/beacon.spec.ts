import tape from 'tape'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { ssz } from '@lodestar/types'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import {
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
  MainnetGenesisValidatorsRoot,
} from '../../../src/subprotocols/beacon/types.js'

tape('portal network spec test vectors', (t) => {
  const specTestVectors = require('./specTestVectors.json')
  const genesisRoot = fromHexString(MainnetGenesisValidatorsRoot) // Genesis Validators Root
  const config = createBeaconConfig(defaultChainConfig, genesisRoot)
  const serializedOptimistincUpdate = fromHexString(
    specTestVectors.optimisticUpdate['6718463'].content_value
  )
  const serializedOptimistincUpdateKey = fromHexString(
    specTestVectors.optimisticUpdate['6718463'].content_key
  )
  const forkDigest = ssz.ForkDigest.deserialize(serializedOptimistincUpdate.slice(0, 4))

  t.equal(config.forkDigest2ForkName(forkDigest), 'capella', 'derived correct fork')
  const deserializedOptimisticUpdate = ssz.capella.LightClientOptimisticUpdate.deserialize(
    serializedOptimistincUpdate.slice(4)
  )
  const optimisticUpdateKey = LightClientOptimisticUpdateKey.deserialize(
    serializedOptimistincUpdateKey.slice(1)
  )
  t.equal(
    deserializedOptimisticUpdate.attestedHeader.beacon.slot,
    6718463,
    'deserialized optimistic update'
  )
  t.equal(optimisticUpdateKey.zero, 0n, 'correctly deserialized optimstic update key')

  const finalityUpdate = fromHexString(specTestVectors.finalityUpdate['6718463'].content_value)
  const finalityUpdateKey = fromHexString(
    specTestVectors.finalityUpdate['6718463'].content_key
  ).slice(1)
  const deserializedFinalityUpdate = ssz.capella.LightClientFinalityUpdate.deserialize(
    finalityUpdate.slice(4)
  )
  t.equal(
    deserializedFinalityUpdate.attestedHeader.beacon.slot,
    6718463,
    'deserialized finality update'
  )
  t.equal(
    LightClientFinalityUpdateKey.deserialize(finalityUpdateKey).zero,
    0n,
    'deserialized finality update key'
  )
  const bootstrap = specTestVectors.bootstrap['6718368']
  const deserializedBootstrap = ssz.capella.LightClientBootstrap.deserialize(
    fromHexString(bootstrap.content_value).slice(4)
  )
  const bootstrapKey = fromHexString(bootstrap.content_key).slice(1)

  t.equal(deserializedBootstrap.header.beacon.slot, 6718368, 'deserialized bootstrap')
  t.equal(
    toHexString(LightClientBootstrapKey.deserialize(bootstrapKey).blockHash),
    '0xbd9f42d9a42d972bdaf4dee84e5b419dd432b52867258acb7bcc7f567b6e3af1',
    'deserialized light client bootstrap key'
  )
  const updateByRange = fromHexString(specTestVectors.updateByRange['6684738'].content_value)
  const updateByRangeKey = fromHexString(
    specTestVectors.updateByRange['6684738'].content_key
  ).slice(1)
  const deserializedRange = LightClientUpdatesByRange.deserialize(updateByRange)

  let numUpdatesDeserialized = 0
  for (const update of deserializedRange) {
    const forkdigest = update.slice(0, 4)
    const forkname = config.forkDigest2ForkName(forkdigest)
    //@ts-ignore - typescript won't let me set `forkname` to a value from of the Forks type
    ssz[forkname].LightClientUpdate.deserialize(update.slice(4)).attestedHeader.beacon.slot
    numUpdatesDeserialized++
  }
  t.equal(numUpdatesDeserialized, 4, 'deserialized LightClientUpdatesByRange')
  t.equal(
    LightClientUpdatesByRangeKey.deserialize(updateByRangeKey).count,
    4n,
    'deserialized update by range key'
  )
  t.end()
})
