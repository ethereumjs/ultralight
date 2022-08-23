import tape from 'tape'
import { Block, BlockHeader } from '@ethereumjs/block'
import {
  blockNumberToGindex,
  EpochAccumulator,
  HeaderAccumulatorType,
  HeaderRecord,
} from '../../../src/index.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { createRequire } from 'module'
import {
  createProof,
  LeafNode,
  MultiProof,
  ProofType,
  Tree,
} from '@chainsafe/persistent-merkle-tree'
const require = createRequire(import.meta.url)

// 1. Build accumulator to >0 historical_epochs
// 2. Respond to request for Header Proof by creating proof from historical epoch

tape('Header Record Proof tests', (t) => {
  const accumulator = require('../../integration/testAccumulator.json')
  const epoch = require('../../integration/testEpoch.json')
  const block1000 = require('../../integration/testBlock1000.json')
  const headerAccumulator = HeaderAccumulatorType.deserialize(fromHexString(accumulator))
  const historicalEpoch = EpochAccumulator.deserialize(fromHexString(epoch.serialized))
  const header = BlockHeader.fromRLPSerializedHeader(
    Buffer.from(fromHexString(block1000.rawHeader)),
    {
      hardforkByBlockNumber: true,
    }
  )
  t.test('Test Data is valid', (st) => {
    const hashes = [...historicalEpoch.values()].map((headerRecord) => {
      return toHexString(headerRecord.blockHash)
    })
    st.ok(
      headerAccumulator.historicalEpochs
        .map((value) => toHexString(value))
        .includes(toHexString(EpochAccumulator.hashTreeRoot(historicalEpoch))),
      'EpochAccumulator is a part of HeaderAccumulator'
    )
    st.ok(hashes.includes(toHexString(header.hash())), 'Header is a part of EpochAccumulator')
    st.end()
  })
  t.test('Epoch Accumulator can create proof for header record.', (st) => {
    const gIndex = blockNumberToGindex(header.number)
    const tree = EpochAccumulator.deserializeToView(fromHexString(epoch.serialized))

    const leaves = tree.getAllReadonlyValues()
    const headerRecord = leaves[Number(header.number) % 8192]

    st.equal(
      toHexString(headerRecord.blockHash),
      toHexString(header.hash()),
      'Test Header found in deserialized epoch at correct index'
    )

    const proof = createProof(tree.node, {
      type: ProofType.multi,
      gindices: [gIndex],
    }) as MultiProof
    st.equal(
      toHexString(proof.leaves[0]),
      toHexString(HeaderRecord.hashTreeRoot(headerRecord)),
      'Successfully made a proof for a HeaderRecord'
    )
    st.equal(proof.witnesses.length, 14, 'proof is correct size')

    try {
      const reconstructedEpoch = EpochAccumulator.createFromProof(
        proof,
        EpochAccumulator.hashTreeRoot(historicalEpoch)
      )
      const n = reconstructedEpoch.hashTreeRoot()
      st.deepEqual(
        n,
        EpochAccumulator.hashTreeRoot(historicalEpoch),
        'Successfully reconstructed SSZ tree from proof'
      )
    } catch {
      st.fail('Failed to reconstruct SSZ tree from proof')
    }

    st.end()
  })

  t.end()
})
