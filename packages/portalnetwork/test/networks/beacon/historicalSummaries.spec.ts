import { ProofType } from '@chainsafe/persistent-merkle-tree'
import { hexToBytes } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import { describe, it } from 'vitest'

describe('historicalSummaries', () => {
  it('should verify historicalSummariesProof', async () => {
    const proofJson = (await import('./historicalSummariesProof_slot_9553824.json')).default
    const summariesJson = (await import('./historicalSummaries.json')).default
    const historicalSummaries =
      ssz.deneb.BeaconState.fields.historicalSummaries.fromJson(summariesJson)

    const reconstructedState = ssz.capella.BeaconState.createFromProof({
      type: ProofType.single,
      gindex: ssz.capella.BeaconState.getPathInfo(['historicalSummaries']).gindex,
      witnesses: proofJson.map((witness) => hexToBytes(witness)),
      leaf: ssz.deneb.BeaconState.fields.historicalSummaries
        .toView(historicalSummaries)
        .hashTreeRoot(),
    })
  })
})
