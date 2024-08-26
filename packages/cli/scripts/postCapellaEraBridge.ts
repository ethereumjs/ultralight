import { ssz } from '@lodestar/types'
import { decompressBeaconState, getEraIndexes, readEntry } from 'e2store'
import { readFileSync } from 'fs'

const main = async () => {
  const data = new Uint8Array(readFileSync('./mainnet-01183-595cb34b.era'))
  const indices = getEraIndexes(data)
  const stateEntry = readEntry(
    data.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
  )
  const state = await decompressBeaconState(stateEntry.data)
  console.log(state.slot)
  console.log()
  const block = ssz.deneb.BeaconBlock.fromJson(res.message)
  const elBlockHashPath = ssz.bellatrix.BeaconBlock.getPathInfo([
    'body',
    'executionPayload',
    'blockHash',
  ])

  const beaconBlockProof = createProof(ssz.bellatrix.BeaconBlock.toView(block).node, {
    gindex: elBlockHashPath.gindex,
    type: ProofType.single,
  }) as SingleProof

  const historicalRootsPath = ssz.phase0.HistoricalBatch.getPathInfo([
    'blockRoots',
    merge_block_index,
  ])
  console.log(
    `Merge Block blockRoot: ${bytesToHex(ssz.bellatrix.BeaconBlock.value_toTree(block).root)} and found in era 574 historicalBatch ${equalsBytes(ssz.bellatrix.BeaconBlock.value_toTree(block).root, postMergeBatch.blockRoots[merge_block_index])}`,
  )
  const historicalRootsProof = createProof(ssz.phase0.HistoricalBatch.toView(postMergeBatch).node, {
    gindex: historicalRootsPath.gindex,
    type: ProofType.single,
  }) as SingleProof
  const headerProof = HistoricalRootsBlockProof.fromJson({
    slot: merge_slot,
    historicalRootsProof: historicalRootsProof.witnesses.map((witness) => bytesToHex(witness)),
    beaconBlockHeaderProof: beaconBlockProof.witnesses.map((witness) => bytesToHex(witness)),
    beaconBlockHeaderRoot: bytesToHex(ssz.bellatrix.BeaconBlock.value_toTree(block).root),
  })
  console.log(HistoricalRootsBlockProof.toJson(headerProof))
}

void main()
