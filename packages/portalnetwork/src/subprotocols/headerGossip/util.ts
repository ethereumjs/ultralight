import { Proof } from '@chainsafe/persistent-merkle-tree'
import { ProofView } from './types'

export function viewProof(proof: Proof): ProofView {
  return {
    type: (proof as any).type,
    gIndex: (proof as any).gindex,
    leaf: (proof as any).leaf,
    witness: (proof as any).witness ?? [],
  }
}
