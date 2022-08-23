import tape from 'tape'
import { Block, BlockHeader } from '@ethereumjs/block'
import {
  blockNumberToGindex,
  EpochAccumulator,
  HeaderAccumulator,
  HeaderAccumulatorType,
  HeaderRecord,
} from '../../../src/index.js'
import {
  ByteVectorType,
  ContainerType,
  fromHexString,
  toHexString,
  UintBigintType,
} from '@chainsafe/ssz'
import { createRequire } from 'module'
import {
  createProof,
  LeafNode,
  MultiProof,
  ProofType,
  Tree,
} from '@chainsafe/persistent-merkle-tree'
import { ListCompositeTreeView } from '@chainsafe/ssz/lib/view/listComposite.js'
const require = createRequire(import.meta.url)

// 1. Build accumulator to >0 historical_epochs
// 2. Respond to request for Header Proof by creating proof from historical epoch

tape('Header Record Proof tests', (t) => {
  const accumulator = require('../../integration/testAccumulator.json')
  const epoch = require('../../integration/testEpoch.json')
  const block1000 = require('../../integration/testBlock1000.json')
  const headerRecord1000 = {
    blockHash: '0x5b4590a9905fa1c9cc273f32e6dc63b4c512f0ee14edc6fa41c26b416a7b5d58',
    totalDifficulty: 22019797038325n,
  }
  const headerAccumulator = HeaderAccumulatorType.deserialize(fromHexString(accumulator))
  const historicalEpoch = EpochAccumulator.deserialize(fromHexString(epoch.serialized))
  const header = BlockHeader.fromRLPSerializedHeader(
    Buffer.from(fromHexString(block1000.rawHeader)),
    {
      hardforkByBlockNumber: true,
    }
  )
  t.test('Test Data is valid', (st) => {
    st.equal(
      headerAccumulator.historicalEpochs.length,
      1,
      'Successfully created Header Accumulator from stored bytes'
    )
    st.equal(
      toHexString(EpochAccumulator.hashTreeRoot(historicalEpoch)),
      toHexString(headerAccumulator.historicalEpochs[0]),
      'Header Accumulator contains hash tree root of stored Epoch Accumulator'
    )
    const hashes = [...historicalEpoch.values()].map((headerRecord) => {
      return toHexString(headerRecord.blockHash)
    })
    st.equal(
      toHexString(header.hash()),
      block1000.hash,
      'Successfully created BlockHeader from stored bytes'
    )
    st.ok(hashes.includes(toHexString(header.hash())), 'Header is a part of EpochAccumulator')
    st.end()
  })

  t.test('Epoch Accumulator can create proof for header record.', (st) => {
    const gIndex = blockNumberToGindex(header.number)
    const tree = EpochAccumulator.deserializeToView(fromHexString(epoch.serialized))

    const leaves = tree.getAllReadonlyValues()
    const headerRecord = leaves[Number(header.number) % 8192]

    st.equal(gIndex, 17384n, 'gIndex for Header Record calculated from block number')
    st.equal(leaves.length, 8192, 'SSZ Merkle Tree created from serialized Epoch Accumulator bytes')
    st.deepEqual(
      {
        blockHash: toHexString(headerRecord.blockHash),
        totalDifficulty: headerRecord.totalDifficulty,
      },
      headerRecord1000,
      'HeaderRecord found located in Epoch Accumulator Tree by gIndex'
    )
    st.equal(
      toHexString(headerRecord.blockHash),
      toHexString(header.hash()),
      'HeadeRecord blockHash matches blockHeader'
    )

    const proof = createProof(tree.node, {
      type: ProofType.multi,
      gindices: [gIndex],
    }) as MultiProof
    st.equal(
      toHexString(proof.leaves[0]),
      toHexString(HeaderRecord.hashTreeRoot(headerRecord)),
      'Successfully created a Proof for Header Record'
    )
    st.equal(proof.witnesses.length, 14, 'proof is correct size')
    st.equal(proof.gindices[0], gIndex, 'Proof is for correct Index')
    let reconstructedEpoch: ListCompositeTreeView<
      ContainerType<{
        blockHash: ByteVectorType
        totalDifficulty: UintBigintType
      }>
    >
    try {
      reconstructedEpoch = EpochAccumulator.createFromProof(
        proof,
        EpochAccumulator.hashTreeRoot(historicalEpoch)
      )
      const n = reconstructedEpoch.hashTreeRoot()
      st.deepEqual(
        n,
        EpochAccumulator.hashTreeRoot(historicalEpoch),
        'Successfully reconstructed partial EpochAccumulator SSZ tree from Proof'
      )
      try {
        const leaf = reconstructedEpoch.get(1000)
        st.pass('SSZ Tree has a leaf at the expected index')
        st.equal(
          toHexString(leaf.hashTreeRoot()),
          toHexString(HeaderRecord.hashTreeRoot(headerRecord)),
          'Leaf contains correct Header Record'
        )
      } catch {
        st.fail('SSZ Should have a leaf at the expected index')
      }
      try {
        reconstructedEpoch.getAllReadonly()
        st.fail('Reconstructed Tree contains leaves that it should not')
      } catch {
        st.pass('Reconstructed Tree should not contain leaves without proof')
      }
    } catch {
      st.fail('Failed to reconstruct SSZ tree from proof')
    }

    st.end()
  })

  t.end()
})
