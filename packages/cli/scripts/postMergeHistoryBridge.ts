import { readFileSync } from 'fs'
import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex, equalsBytes } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'
import { HistoricalRootsBlockProof } from 'portalnetwork'
import { cwd } from 'process'

import type { SingleProof } from '@chainsafe/persistent-merkle-tree'

const { Client } = jayson

const main = async () => {
  const beaconNode = 'https://lodestar-mainnet.chainsafe.io'
  const _ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

  const historicalBatch = readFileSync(
    cwd() + '/scripts/historicalBatches/historical_batch-574-3c0da77d.ssz',
  )
  const postMergeBatch = ssz.phase0.HistoricalBatch.deserialize(Buffer.from(historicalBatch))

  const merge_slot = 4700013 // The Beacon Chain slot number corresponding to the merge block
  const merge_block_index = 5997 // The index of the merge block blockRoot in the historical batch for era 574 (where the merge occurred)
  console.log('Retrieving beacon block...')
  const res = (await (await fetch(beaconNode + `/eth/v2/beacon/blocks/${merge_slot}`)).json()).data
  const block = ssz.bellatrix.BeaconBlock.fromJson(res.message)
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

main().catch((err) => {
  console.log('caught error', err)
  process.exit(0)
})
