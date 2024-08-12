import { bytesToHex } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'

const blockRootsJson = await import('./epoch1183.json')
console.log(blockRootsJson)
const blockRoots = ssz.phase0.HistoricalBlockRoots.fromJson(blockRootsJson.default)
console.log(bytesToHex(ssz.phase0.HistoricalBlockRoots.toView(blockRoots).hashTreeRoot()))
// const blockRootsPath = ssz.phase0.HistoricalBlockRoots.getPathInfo([6421])
// const proof = new Tree(
//   ssz.phase0.HistoricalBlockRoots.toView(state.blockRoots).node,
// ).getSingleProof(blockRootsPath.gindex)
