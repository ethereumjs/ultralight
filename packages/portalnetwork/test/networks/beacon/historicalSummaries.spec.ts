import { ProofType } from '@chainsafe/persistent-merkle-tree'
import { hexToBytes } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import { assert, describe, it } from 'vitest'

describe('historicalSummaries', () => {
  it('should verify historicalSummariesProof', async () => {
    const summariesJson = (await import('./testData/historicalSummaries_slot11708128.json')).default
    const historicalSummaries =
      ssz.electra.BeaconState.fields.historicalSummaries.fromJson(summariesJson.data.historical_summaries)
    const finalityUpdateJson = (
      await import('./testData/finalityUpdate_slot11708128.json')
    ).data
    const finalizedHeader = ssz.electra.LightClientFinalityUpdate.fromJson(finalityUpdateJson)
    const reconstructedState = ssz.electra.BeaconState.createFromProof({
      type: ProofType.single,
      gindex: ssz.electra.BeaconState.getPathInfo(['historicalSummaries']).gindex,
      witnesses: summariesJson.data.proof.map((witness: string) => hexToBytes(witness as `0x${string}`)),
      leaf: ssz.electra.BeaconState.fields.historicalSummaries
        .toView(historicalSummaries)
        .hashTreeRoot(),
    })

    // Verifies that the root of the historicalSummaries state proof matches the state root of the finalityUpdate for the same epoch
    assert.deepEqual(
      finalizedHeader.finalizedHeader.beacon.stateRoot,
      reconstructedState.hashTreeRoot(),
    )
  })
})
