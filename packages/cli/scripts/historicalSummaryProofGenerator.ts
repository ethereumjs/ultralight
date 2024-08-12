import { ProofType, Tree, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import { readFileSync, writeFileSync } from 'fs'

let stateData = readFileSync('./scripts/beaconState_9692960.ssz')
let state = ssz.deneb.BeaconState.deserialize(stateData)
const blockRoots = state.blockRoots

const blockJson = (await import('./slot_9689365.json')).data.message
const block = ssz.deneb.BeaconBlock.fromJson(blockJson)
const blockRoot = state.blockRoots[6421]
console.log(bytesToHex(state.blockRoots[6421]))
console.log(bytesToHex(ssz.deneb.BeaconBlock.toView(block).hashTreeRoot()))
const blockRootsPath = ssz.phase0.HistoricalBlockRoots.getPathInfo([6421])
const proof = new Tree(
  ssz.phase0.HistoricalBlockRoots.toView(state.blockRoots).node,
).getSingleProof(blockRootsPath.gindex)

stateData = readFileSync('./scripts/beaconHead.ssz')
state = ssz.deneb.BeaconState.deserialize(stateData)
const hs = state.historicalSummaries
console.log(bytesToHex(ssz.phase0.HistoricalBlockRoots.toView(blockRoots).hashTreeRoot()))

const reconstructedSummary = ssz.phase0.HistoricalBlockRoots.createFromProof({
  witnesses: proof,
  type: ProofType.single,
  gindex: blockRootsPath.gindex,
  leaf: blockRoot, // This should be the leaf value this proof is verifying
})

console.log(state.historicalSummaries[423])
console.log(bytesToHex(reconstructedSummary.hashTreeRoot()))
