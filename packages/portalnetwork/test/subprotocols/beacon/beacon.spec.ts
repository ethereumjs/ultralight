import tape from 'tape'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { lightClientOptimisticUpdateFromJson } from '../../../src/subprotocols/beacon/helpers.js'
import { LightClientOptimisticUpdate } from '../../../src/subprotocols/beacon/types.js'
import { fromHexString, getUint8ByteToBitBooleanArray } from '@chainsafe/ssz'
tape('type tests', (t) => {
  const testdata = require('./testdata.json')
  const bytes = fromHexString(testdata.optimistic_update.sync_aggregate.sync_committee_bits)
  const bools = [] as boolean[][]
  for (const byte of bytes) {
    bools.push(getUint8ByteToBitBooleanArray(byte))
  }

  const optimisticUpdate = lightClientOptimisticUpdateFromJson(testdata.optimistic_update)
  const serializedUpdate = LightClientOptimisticUpdate.serialize(optimisticUpdate)
  t.equal(
    LightClientOptimisticUpdate.deserialize(serializedUpdate).attestedHeader.slot,
    43n,
    'optimistic update successfully serialized from JSON and deserialized'
  )
  t.end()
})
