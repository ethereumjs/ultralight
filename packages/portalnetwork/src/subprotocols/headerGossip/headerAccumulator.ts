import { Proof } from '@chainsafe/persistent-merkle-tree'
import { toHexString } from '@chainsafe/ssz'
import { BlockHeader } from '@ethereumjs/block'
import { EpochAccumulator, EPOCH_SIZE, HeaderRecordType, ProofView } from './types'
import { viewProof } from './util'

export class HeaderAccumulator {
  private _currentEpoch: HeaderRecordType[]
  private _historicalEpochs: Uint8Array[]

  constructor() {
    this._currentEpoch = []
    this._historicalEpochs = []
  }

  public get currentEpoch() {
    return this._currentEpoch
  }

  public get historicalEpochs() {
    return this._historicalEpochs
  }

  public updateAccumulator = (newHeader: BlockHeader) => {
    const lastTd =
      this._currentEpoch.length === 0
        ? 0n
        : this._currentEpoch[this._currentEpoch.length - 1].totalDifficulty

    if (this._currentEpoch.length === EPOCH_SIZE) {
      const currentEpochHash = EpochAccumulator.hashTreeRoot(this._currentEpoch)
      this._historicalEpochs.push(currentEpochHash)
      this._currentEpoch = []
    }

    const headerRecord = {
      blockHash: newHeader.hash(),
      totalDifficulty: lastTd + BigInt(newHeader.difficulty.toString(10)),
    }
    this._currentEpoch.push(headerRecord)
  }

  public verifyInclusionProof = (proof: Proof, header: BlockHeader) => {
    const epochTree = EpochAccumulator.toView(this._currentEpoch)
    const reconstructedTree = EpochAccumulator.createFromProof(proof)
    const leaves = EpochAccumulator.tree_getLeafGindices(0n, reconstructedTree.node)
    const _proof: ProofView = viewProof(proof)
    const gindex = leaves.indexOf(_proof.gIndex)
    try {
      const value = reconstructedTree.get(gindex - 1)
      if (
        toHexString(value.blockHash) === toHexString(header.hash()) &&
        toHexString(epochTree.hashTreeRoot()) === toHexString(reconstructedTree.hashTreeRoot())
      ) {
        return true
      } //eslint-disable-next-line prettier/prettier
    } catch { }

    return false
  }
}
