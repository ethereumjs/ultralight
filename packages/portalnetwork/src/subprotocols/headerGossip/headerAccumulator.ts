import { Proof } from '@chainsafe/persistent-merkle-tree'
import { toHexString } from '@chainsafe/ssz'
import { BlockHeader } from '@ethereumjs/block'
import { EpochAccumulator, EPOCH_SIZE, HeaderRecordType } from './types'

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

  /**
   * Adds a new block header to the `currentEpoch` in the header accumulator
   */
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
  /**
   *
   * @param proof a `Proof` for a particular header's inclusion in an `epochAccumulator`
   * @param header the blockheader being proved to be included in the `epochAccumulator`
   * @param blockPosition the index in the array of `HeaderRecord`s of the header
   * @returns
   */
  public verifyInclusionProof = (proof: Proof, header: BlockHeader, blockPosition: number) => {
    const reconstructedTree = EpochAccumulator.createFromProof(proof)

    const epochTree = EpochAccumulator.toView(this._currentEpoch)
    try {
      const value = reconstructedTree.get(blockPosition)
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
