import tape from 'tape'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { lightClientOptimisticUpdateFromJson } from '../../../src/subprotocols/beaconChain/helpers.js'
import { LightClientOptimisticUpdate } from '../../../src/subprotocols/beaconChain/types.js'
tape('type tests', (t) => {
  const testdata = require('./testdata.json')

  const optimisticUpdate = lightClientOptimisticUpdateFromJson(testdata.optimistic_update)
  const serializedUpdate = LightClientOptimisticUpdate.serialize(optimisticUpdate)
  t.equal(
    LightClientOptimisticUpdate.deserialize(serializedUpdate).attestedHeader.slot,
    43n,
    'optimistic update successfully serialized from JSON and deserialized'
  )
  t.end()
})
