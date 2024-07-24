import { ProofType } from '@chainsafe/persistent-merkle-tree'
import { hexToBytes } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import { assert, describe, it } from 'vitest'

describe('historicalSummaries', () => {
  it('should verify historicalSummariesProof', async () => {
    const summariesProofJson = (
      await import('./testData/historicalSummariesProof_slot_9583072.json')
    ).default
    const summariesJson = (await import('./testData/historicalSummaries_slot_9583072.json')).default
    const historicalSummaries =
      ssz.deneb.BeaconState.fields.historicalSummaries.fromJson(summariesJson)
    const finalityUpdateJson = (
      await import('./testData/lightClientFinalityUpdate_slot_9583072.json')
    ).data
    const finalizedHeader =
      ssz.allForksLightClient.altair.LightClientFinalityUpdate.fromJson(finalityUpdateJson)
    const reconstructedState = ssz.capella.BeaconState.createFromProof({
      type: ProofType.single,
      gindex: ssz.capella.BeaconState.getPathInfo(['historicalSummaries']).gindex,
      witnesses: summariesProofJson.map((witness) => hexToBytes(witness)),
      leaf: ssz.deneb.BeaconState.fields.historicalSummaries
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
