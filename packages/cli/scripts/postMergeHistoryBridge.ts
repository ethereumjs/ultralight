import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { hexToBytes } from '@ethereumjs/util'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import { genesisData } from '@lodestar/config/networks'
import { ForkName } from '@lodestar/params'
import { ssz } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'

import type { SingleProof } from '@chainsafe/persistent-merkle-tree'

const { Client } = jayson

const main = async () => {
  const beaconConfig = createBeaconConfig(
    defaultChainConfig,
    hexToBytes(genesisData.mainnet.genesisValidatorsRoot),
  )
  const BellatrixForkDigest = beaconConfig.forkName2ForkDigest(ForkName.bellatrix)
  const beaconNode = 'https://lodestar-mainnet.chainsafe.io'
  const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

  const merge_slot = 4700013
  console.log('Retrieving beacon block...')
  const res = (await (await fetch(beaconNode + `/eth/v2/beacon/blocks/${merge_slot}`)).json()).data
  const block = ssz.bellatrix.BeaconBlock.fromJson(res.message)
  const elBlockHashPath = ssz.bellatrix.BeaconBlockBody.getPathInfo([
    'executionPayload',
    'blockHash',
  ])
  const blockBodyRootHash = ssz.bellatrix.BeaconBlock.getPathInfo(['body'])
  const beaconBlockBodyProof = createProof(ssz.bellatrix.BeaconBlockBody.toView(block.body).node, {
    gindex: elBlockHashPath.gindex,
    type: ProofType.single,
  }) as SingleProof
  const beaconBlockHeaderProof = createProof(ssz.bellatrix.BeaconBlock.toView(block).node, {
    gindex: blockBodyRootHash.gindex,
    type: ProofType.single,
  }) as SingleProof

  console.log(beaconBlockBodyProof.witnesses.length)
  console.log(beaconBlockHeaderProof.witnesses.length)
}

main().catch((err) => {
  console.log('caught error', err)
  process.exit(0)
})
