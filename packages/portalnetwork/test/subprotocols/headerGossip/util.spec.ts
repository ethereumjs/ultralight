import { createProof, ProofType } from '@chainsafe/persistent-merkle-tree'
import { ListBasicType, UintNumberType } from '@chainsafe/ssz'
import { viewProof } from '../../../src/subprotocols/headerGossip'
import tape from 'tape'

tape('Proof view tests', (t) => {
  const listType = new ListBasicType(new UintNumberType(1), 10)
  const list = [1, 2, 3]
  const tree = listType.toView(list)
  const leaves = listType.tree_getLeafGindices(0n, tree.node)
  const proof = createProof(tree.node, {
    gindex: leaves[0],
    type: ProofType.single,
  })
  const detailedProof = viewProof(proof)
  t.equal(detailedProof.gIndex, leaves[0], 'proof has same gIndex as first leave value')
  t.end(0)
})
