import tape from 'tape'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { fromHexString } from '@chainsafe/ssz'
import { ssz } from '@lodestar/types'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import { MainnetGenesisValidatorsRoot } from '../../../src/subprotocols/beacon/types.js'

tape('portal network spec test vectors', (t) => {
  const specTestVectors = require('./specTestVectors.json')
  const genesisRoot = fromHexString(MainnetGenesisValidatorsRoot) // Genesis Validators Root
  const serializedOptimistincUpdate = fromHexString(
    specTestVectors.optimisticUpdate['6718463'].content_value
  )
  const forkDigest = ssz.ForkDigest.deserialize(serializedOptimistincUpdate.slice(0, 4))

  const config = createBeaconConfig(defaultChainConfig, genesisRoot)
  console.log(config.forkDigest2ForkName(forkDigest))
  const deserializedOptimisticUpdate = ssz.capella.LightClientOptimisticUpdate.deserialize(
    serializedOptimistincUpdate.slice(4)
  )
  console.log(deserializedOptimisticUpdate)
  const finalityUpdate = fromHexString(specTestVectors.finalityUpdate['6718463'].content_value)
  const deserializedFinalityUpdate = ssz.capella.LightClientFinalityUpdate.deserialize(
    finalityUpdate.slice(4)
  )
  console.log(deserializedFinalityUpdate)
  const bootstrap = specTestVectors.bootstrap['6718368']
  const deserializedBootstrap = ssz.capella.LightClientBootstrap.deserialize(
    fromHexString(bootstrap.content_value).slice(4)
  )
  console.log(deserializedBootstrap)
  t.end()
})
