import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import { decompressBeaconState, getEraIndexes, readEntry } from 'e2store'
import { readFileSync } from 'fs'
import { HistoricalSummariesBlockProof } from 'portalnetwork'

import type { SingleProof } from '@chainsafe/persistent-merkle-tree'

const main = async () => {
  const data = new Uint8Array(readFileSync('./mainnet-01183-595cb34b.era'))
  const indices = getEraIndexes(data)
  const stateEntry = readEntry(
    data.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
  )
  const state = await decompressBeaconState(stateEntry.data, indices.stateSlotIndex.startSlot)
  const blockIndexInBlockRoots = 0
  const block = ssz.deneb.BeaconBlock.fromJson((await import('../block.json')).data.message)
  const elBlockHashPath = ssz.bellatrix.BeaconBlock.getPathInfo([
    'body',
    'executionPayload',
    'blockHash',
  ])

  const beaconBlockProof = createProof(ssz.bellatrix.BeaconBlock.toView(block).node, {
    gindex: elBlockHashPath.gindex,
    type: ProofType.single,
  }) as SingleProof

  const historicalRootsPath = ssz.capella.BeaconState.fields.blockRoots.getPathInfo([
    blockIndexInBlockRoots,
  ])

  const historicalRootsProof = createProof(
    ssz.capella.BeaconState.fields.blockRoots.toView(state.blockRoots).node,
    {
      gindex: historicalRootsPath.gindex,
      type: ProofType.single,
    },
  ) as SingleProof
  const headerProof = HistoricalSummariesBlockProof.fromJson({
    slot: block.slot,
    historicalSummariesProof: historicalRootsProof.witnesses.map((witness) => bytesToHex(witness)),
    beaconBlockProof: beaconBlockProof.witnesses.map((witness) => bytesToHex(witness)),
    beaconBlockRoot: bytesToHex(ssz.capella.BeaconBlock.value_toTree(block).root),
  })
  console.log(HistoricalSummariesBlockProof.toJson(headerProof))
}

void main()
