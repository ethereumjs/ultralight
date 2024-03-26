import { readFileSync } from 'fs'
import { resolve } from 'path'
import { assert, describe, it } from 'vitest'

import { EpochAccumulator, MasterAccumulatorType } from '../../../src/index.js'

describe('Accumulator spec tests', () => {
  it('should deserialize the master accumulator', () => {
    const acc = readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/history/accumulator/finished_accumulator.ssz',
      ),
    )
    const masterAccumulator = MasterAccumulatorType.deserialize(acc)
    assert.equal(masterAccumulator.historicalEpochs.length, 1897)
  })
  it('should deserialize an epoch accumulator', () => {
    const acc = readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/history/accumulator/epoch-accumulator-00122.ssz',
      ),
    )
    const epochAccumulator = EpochAccumulator.deserialize(acc)
    assert.equal(epochAccumulator[0].totalDifficulty, 7128007083488816122n)
  })
})
