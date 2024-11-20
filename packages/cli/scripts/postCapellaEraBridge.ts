import { readFileSync } from 'fs'
import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex } from '@ethereumjs/util'
import { getChainForkConfigFromNetwork } from '@lodestar/light-client/utils'
import { ssz, sszTypesFor } from '@lodestar/types'
import { decompressBeaconState, getEraIndexes, readEntry } from 'e2store'
import { HistoricalSummariesBlockProof } from 'portalnetwork'

import type { SingleProof } from '@chainsafe/persistent-merkle-tree'

const main = async () => {
  const data = new Uint8Array(readFileSync('./mainnet-01183-595cb34b.era'))
  const indices = getEraIndexes(data)
  const stateEntry = readEntry(
    data.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
  )
  const forkConfig = getChainForkConfigFromNetwork('mainnet')
  const stateFork = forkConfig.getForkName(indices.stateSlotIndex.startSlot)
  const state = await decompressBeaconState(stateEntry.data, indices.stateSlotIndex.startSlot)
  const blockIndexInBlockRoots = 0
  const blockJson = (await import('../block.json')).data.message
  const blockFork = forkConfig.getForkName(parseInt(blockJson.slot))
  const block = sszTypesFor(blockFork).BeaconBlock.fromJson(blockJson)
  const elBlockHashPath = sszTypesFor(blockFork).BeaconBlock.getPathInfo([
    'body',
    'executionPayload',
    'blockHash',
  ])

  const beaconBlockProof = createProof(sszTypesFor(blockFork).BeaconBlock.toView(block).node, {
    gindex: elBlockHashPath.gindex,
    type: ProofType.single,
  }) as SingleProof

  const blockRootsPath = ssz[stateFork].BeaconState.fields.blockRoots.getPathInfo([
    blockIndexInBlockRoots,
  ])

  const blockRootsProof = createProof(
    ssz[stateFork].BeaconState.fields.blockRoots.toView(state.blockRoots).node,
    {
      gindex: blockRootsPath.gindex,
      type: ProofType.single,
    },
  ) as SingleProof

  const headerProof = HistoricalSummariesBlockProof.fromJson({
    slot: block.slot,
    historicalSummariesProof: blockRootsProof.witnesses.map((witness) => bytesToHex(witness)),
    beaconBlockProof: beaconBlockProof.witnesses.map((witness) => bytesToHex(witness)),
    beaconBlockRoot: bytesToHex(sszTypesFor(blockFork).BeaconBlock.toView(block).hashTreeRoot()),
  })
  console.log(HistoricalSummariesBlockProof.toJson(headerProof))
}

void main()
