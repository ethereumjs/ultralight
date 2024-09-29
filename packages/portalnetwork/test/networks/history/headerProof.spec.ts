import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex } from '@chainsafe/ssz'
import { BlockHeader } from '@ethereumjs/block'
import { hexToBytes } from '@ethereumjs/util'
import { createChainForkConfig } from '@lodestar/config'
import { ssz } from '@lodestar/types'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import { createRequire } from 'module'
import { resolve } from 'path'
import { assert, beforeAll, describe, it } from 'vitest'

import {
  EpochAccumulator,
  HeaderRecordType,
  HistoricalEpochsType,
  HistoricalRootsBlockProof,
  HistoricalSummariesBlockProof,
  blockNumberToGindex,
  blockNumberToLeafIndex,
  slotToHistoricalBatch,
  slotToHistoricalBatchIndex,
  verifyPostCapellaHeaderProof,
  verifyPreCapellaHeaderProof,
} from '../../../src/index.js'
import { historicalRoots } from '../../../src/networks/history/data/historicalRoots.js'

import type { SingleProof } from '@chainsafe/persistent-merkle-tree'
import type { ByteVectorType, ContainerType, UintBigintType } from '@chainsafe/ssz'
import type { ListCompositeTreeView } from '@chainsafe/ssz/lib/view/listComposite.js'
const require = createRequire(import.meta.url)

describe('Pre-Merge Header Record Proof tests', () => {
  const accumulatorRaw = readFileSync('./test/networks/history/testData/merge_macc.bin', {
    encoding: 'hex',
  })
  const accumulator = '0x' + accumulatorRaw.slice(8)
  const epoch_hex =
    '0x' +
    readFileSync(
      './test/networks/history/testData/0x035ec1ffb8c3b146f42606c74ced973dc16ec5a107c0345858c343fc94780b4218.portalcontent',
      {
        encoding: 'hex',
      },
    )
  const block1000 = require('../../testData/testBlock1000.json')
  const headerRecord1000 = {
    blockHash: '0x5b4590a9905fa1c9cc273f32e6dc63b4c512f0ee14edc6fa41c26b416a7b5d58',
    totalDifficulty: 22019797038325n,
  }
  const historicalEpochs = HistoricalEpochsType.deserialize(hexToBytes(accumulator))
  const epoch = EpochAccumulator.deserialize(hexToBytes(epoch_hex))
  const header = BlockHeader.fromRLPSerializedHeader(hexToBytes(block1000.rawHeader), {
    setHardfork: true,
  })
  it('Test Data is valid', () => {
    assert.equal(historicalEpochs.length, 1897, 'Accumulator contains 1897 historical epochs')
    assert.equal(
      bytesToHex(EpochAccumulator.hashTreeRoot(epoch)),
      bytesToHex(historicalEpochs[0]),
      'Header Accumulator contains hash tree root of stored Epoch Accumulator',
    )
    const hashes = [...epoch.values()].map((headerRecord) => {
      return bytesToHex(headerRecord.blockHash)
    })
    assert.equal(
      bytesToHex(header.hash()),
      block1000.hash,
      'Successfully created BlockHeader from stored bytes',
    )
    assert.ok(hashes.includes(bytesToHex(header.hash())), 'Header is a part of EpochAccumulator')
  })

  it('Epoch Accumulator can create proof for header record.', () => {
    const gIndex = blockNumberToGindex(1000n)
    const leaves = EpochAccumulator.deserialize(hexToBytes(epoch_hex))
    const tree = EpochAccumulator.value_toTree(leaves)
    const headerRecord = leaves[1000]
    assert.equal(blockNumberToLeafIndex(1000n), 2000, 'Leaf index for block number is correct')
    assert.equal(
      gIndex,
      EpochAccumulator.tree_getLeafGindices(1n, tree)[blockNumberToLeafIndex(1000n)],
      'gIndex for Header Record calculated from block number',
    )
    assert.equal(
      leaves.length,
      8192,
      'SSZ Merkle Tree created from serialized Epoch Accumulator bytes',
    )
    assert.deepEqual(
      {
        blockHash: bytesToHex(headerRecord.blockHash),
        totalDifficulty: headerRecord.totalDifficulty,
      },
      headerRecord1000,
      'HeaderRecord found located in Epoch Accumulator Tree by gIndex',
    )
    assert.equal(
      bytesToHex(headerRecord.blockHash),
      bytesToHex(header.hash()),
      'HeadeRecord blockHash matches blockHeader',
    )

    const proof = createProof(tree, {
      type: ProofType.single,
      gindex: gIndex,
    }) as SingleProof
    assert.equal(
      bytesToHex(proof.leaf),
      headerRecord1000.blockHash,
      'Successfully created a Proof for Header Record',
    )
    assert.equal(proof.witnesses.length, 15, 'proof is correct size')
    assert.equal(proof.gindex, gIndex, 'Proof is for correct Index')
    let reconstructedEpoch: ListCompositeTreeView<
      ContainerType<{
        blockHash: ByteVectorType
        totalDifficulty: UintBigintType
      }>
    >
    try {
      reconstructedEpoch = EpochAccumulator.createFromProof(
        proof,
        EpochAccumulator.hashTreeRoot(epoch),
      )
      const n = reconstructedEpoch.hashTreeRoot()
      assert.deepEqual(
        n,
        EpochAccumulator.hashTreeRoot(epoch),
        'Successfully reconstructed partial EpochAccumulator SSZ tree from Proof',
      )
      try {
        const leaf = reconstructedEpoch.get(1000)
        assert.ok(true, 'SSZ Tree has a leaf at the expected index')
        assert.equal(
          bytesToHex(leaf.hashTreeRoot()),
          bytesToHex(HeaderRecordType.hashTreeRoot(headerRecord)),
          'Leaf contains correct Header Record',
        )
      } catch {
        assert.fail('SSZ Should have a leaf at the expected index')
      }
      try {
        reconstructedEpoch.getAllReadonly()
        assert.fail('Reconstructed Tree contains leaves that it should not')
      } catch {
        assert.ok(true, 'Reconstructed Tree should not contain leaves without proof')
      }
    } catch {
      assert.fail('Failed to reconstruct SSZ tree from proof')
    }
  })
})

describe('Bellatrix - Capella header proof tests', () => {
  const postMergeProofJson = require('./testData/mergeBlockHeaderProof.json')
  it('should deserialize proof', () => {
    const postMergeProof = HistoricalRootsBlockProof.fromJson(postMergeProofJson)
    assert.equal(postMergeProof.slot, 4700013n)
    const batchIndex = slotToHistoricalBatchIndex(postMergeProof.slot)
    // The index of the merge block blockRoot in the historical batch for historical batch/era 574 (where the merge occurred)
    const historicalRootsPath = ssz.phase0.HistoricalBatch.getPathInfo([
      'blockRoots',
      Number(batchIndex),
    ])
    const reconstructedBatch = ssz.phase0.HistoricalBatch.createFromProof({
      witnesses: postMergeProof.historicalRootsProof,
      type: ProofType.single,
      gindex: historicalRootsPath.gindex,
      leaf: postMergeProof.beaconBlockRoot, // This should be the leaf value this proof is verifying
    })
    assert.deepEqual(
      reconstructedBatch.hashTreeRoot(),
      hexToBytes(historicalRoots[Number(slotToHistoricalBatch(postMergeProof.slot))]),
    )

    const elBlockHashPath = ssz.bellatrix.BeaconBlock.getPathInfo([
      'body',
      'executionPayload',
      'blockHash',
    ])
    const mergeBlockElBlockHash = hexToBytes(
      '0x56a9bb0302da44b8c0b3df540781424684c3af04d0b7a38d72842b762076a664',
    )
    const reconstructedBlock = ssz.bellatrix.BeaconBlock.createFromProof({
      witnesses: postMergeProof.beaconBlockProof,
      type: ProofType.single,
      gindex: elBlockHashPath.gindex,
      leaf: mergeBlockElBlockHash,
    })

    assert.deepEqual(reconstructedBlock.hashTreeRoot(), postMergeProof.beaconBlockRoot)
  })

  it('should verify a fluffy proof', () => {
    const testString = readFileSync(resolve(__dirname, './testData/fluffyPostMergeProof.yaml'), {
      encoding: 'utf-8',
    })
    const testVector: {
      execution_block_header: string
      beacon_block_proof: string
      beacon_block_root: string
      historical_roots_proof: string
      slot: string
    } = yaml.load(testString) as any
    const fluffyProof = HistoricalRootsBlockProof.fromJson({
      beaconBlockProof: testVector.beacon_block_proof,
      historicalRootsProof: testVector.historical_roots_proof,
      slot: testVector.slot,
      beaconBlockRoot: testVector.beacon_block_root,
      executionBlockHeader: testVector.execution_block_header,
    })
    assert.ok(
      verifyPreCapellaHeaderProof(fluffyProof, hexToBytes(testVector.execution_block_header)),
    )
  })
})

describe('it should verify a post-Capella header proof', () => {
  const forkConfig = createChainForkConfig({})
  let proof: any
  beforeAll(async () => {
    proof = await import('./testData/slot9682944Proof.json')
  })
  it('should instantiate a proof from json', () => {
    const headerProof = HistoricalSummariesBlockProof.fromJson(proof)
    assert.equal(headerProof.slot, proof.slot)
  })
  it('should verify a post-capella header proof', async () => {
    const historicalSummariesJson = await import('./testData/Historical_Summaries_Era_1198.json')

    const historicalSummaries = ssz.deneb.BeaconState.fields.historicalSummaries.fromJson(
      historicalSummariesJson.default,
    )

    const headerProof = HistoricalSummariesBlockProof.fromJson(proof)
    assert.ok(
      verifyPostCapellaHeaderProof(
        headerProof,
        hexToBytes('0xb2044cada59c3479ed264454466610e84fa852547138ccc12a874e921779a983'),
        historicalSummaries,
        forkConfig,
      ),
    )
  })
})
