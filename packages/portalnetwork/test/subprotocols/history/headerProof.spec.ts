import tape from 'tape'
import { BlockHeader } from '@ethereumjs/block'
import {
  blockNumberToGindex,
  blockNumberToLeafIndex,
  EpochAccumulator,
  HeaderRecordType,
  HistoricalEpochsType,
} from '../../../src/index.js'
import {
  ByteVectorType,
  ContainerType,
  fromHexString,
  toHexString,
  UintBigintType,
} from '@chainsafe/ssz'
import { createRequire } from 'module'
import { createProof, ProofType, SingleProof } from '@chainsafe/persistent-merkle-tree'
import { ListCompositeTreeView } from '@chainsafe/ssz/lib/view/listComposite.js'
import { readFileSync } from 'fs'
const require = createRequire(import.meta.url)

tape('Header Record Proof tests', (t) => {
  const accumulatorRaw = readFileSync('./src/subprotocols/history/data/merge_macc.bin', {
    encoding: 'hex',
  })
  const accumulator = accumulatorRaw.slice(8)
  const epoch_hex = readFileSync(
    './test/subprotocols/history/testData/0x035ec1ffb8c3b146f42606c74ced973dc16ec5a107c0345858c343fc94780b4218.portalcontent',
    {
      encoding: 'hex',
    },
  )
  const block1000 = require('../../testData/testBlock1000.json')
  const headerRecord1000 = {
    blockHash: '0x5b4590a9905fa1c9cc273f32e6dc63b4c512f0ee14edc6fa41c26b416a7b5d58',
    totalDifficulty: 22019797038325n,
  }
  const historicalEpochs = HistoricalEpochsType.deserialize(fromHexString(accumulator))
  const epoch = EpochAccumulator.deserialize(fromHexString(epoch_hex))
  const header = BlockHeader.fromRLPSerializedHeader(fromHexString(block1000.rawHeader), {
    setHardfork: true,
  })
  t.test('Test Data is valid', (st) => {
    st.equal(historicalEpochs.length, 1897, 'Accumulator contains 1897 historical epochs')
    st.equal(
      toHexString(EpochAccumulator.hashTreeRoot(epoch)),
      toHexString(historicalEpochs[0]),
      'Header Accumulator contains hash tree root of stored Epoch Accumulator',
    )
    const hashes = [...epoch.values()].map((headerRecord) => {
      return toHexString(headerRecord.blockHash)
    })
    st.equal(
      toHexString(header.hash()),
      block1000.hash,
      'Successfully created BlockHeader from stored bytes',
    )
    st.ok(hashes.includes(toHexString(header.hash())), 'Header is a part of EpochAccumulator')
    st.end()
  })

  t.test('Epoch Accumulator can create proof for header record.', (st) => {
    const gIndex = blockNumberToGindex(1000n)
    const leaves = EpochAccumulator.deserialize(fromHexString(epoch_hex))
    const tree = EpochAccumulator.value_toTree(leaves)
    const headerRecord = leaves[1000]
    st.equal(blockNumberToLeafIndex(1000n), 2000, 'Leaf index for block number is correct')
    st.equal(
      gIndex,
      EpochAccumulator.tree_getLeafGindices(1n, tree)[blockNumberToLeafIndex(1000n)],
      'gIndex for Header Record calculated from block number',
    )
    st.equal(leaves.length, 8192, 'SSZ Merkle Tree created from serialized Epoch Accumulator bytes')
    st.deepEqual(
      {
        blockHash: toHexString(headerRecord.blockHash),
        totalDifficulty: headerRecord.totalDifficulty,
      },
      headerRecord1000,
      'HeaderRecord found located in Epoch Accumulator Tree by gIndex',
    )
    st.equal(
      toHexString(headerRecord.blockHash),
      toHexString(header.hash()),
      'HeadeRecord blockHash matches blockHeader',
    )

    const proof = createProof(tree, {
      type: ProofType.single,
      gindex: gIndex,
    }) as SingleProof
    st.equal(
      toHexString(proof.leaf),
      headerRecord1000.blockHash,
      'Successfully created a Proof for Header Record',
    )
    st.equal(proof.witnesses.length, 15, 'proof is correct size')
    st.equal(proof.gindex, gIndex, 'Proof is for correct Index')
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
      st.deepEqual(
        n,
        EpochAccumulator.hashTreeRoot(epoch),
        'Successfully reconstructed partial EpochAccumulator SSZ tree from Proof',
      )
      try {
        const leaf = reconstructedEpoch.get(1000)
        st.pass('SSZ Tree has a leaf at the expected index')
        st.equal(
          toHexString(leaf.hashTreeRoot()),
          toHexString(HeaderRecordType.hashTreeRoot(headerRecord)),
          'Leaf contains correct Header Record',
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
