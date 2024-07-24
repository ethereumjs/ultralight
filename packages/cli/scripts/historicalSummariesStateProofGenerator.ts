import { Tree } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import { readFileSync, writeFileSync } from 'fs'
const data = readFileSync('./beaconHead.ssz')
const headState = ssz.deneb.BeaconState.deserialize(data)
const json = ssz.deneb.BeaconState.fields.historicalSummaries.toJson(headState.historicalSummaries)
writeFileSync(`./historicalSummaries_slot_${headState.slot}.json`, JSON.stringify(json))
const gindex = ssz.deneb.BeaconState.getPathInfo(['historicalSummaries'])
const proof = new Tree(ssz.deneb.BeaconState.toView(headState).node).getSingleProof(gindex.gindex)
const historicalSummariesProof = proof.map((witness) => bytesToHex(witness))
writeFileSync(
  `./historicalSummariesStateProof_slot_${headState.slot}.json`,
  JSON.stringify(historicalSummariesProof),
)
