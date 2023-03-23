import { createProof, SingleProof, ProofType } from '@chainsafe/persistent-merkle-tree'
import { fromHexString } from '@chainsafe/ssz'
import { BlockHeader } from '@ethereumjs/block'
import {
  blockNumberToGindex,
  EpochAccumulator,
  EPOCH_SIZE,
  getContentKey,
  HeaderProofInterface,
  HeaderRecord,
  ContentType,
  HistoryProtocol,
} from '../index.js'
import accumulator from './data/master.js'

const mainnetHistoricalEpochs: Uint8Array[] = accumulator.map((hash: string) => {
  return fromHexString(hash)
})

export interface AccumulatorOpts {
  storedAccumulator: {
    historicalEpochs: Uint8Array[]
    currentEpoch: HeaderRecord[]
  }
}
export class HeaderAccumulator {
  currentEpoch: HeaderRecord[]
  historicalEpochs: Uint8Array[]

  /**
   *
   * @param initFromGenesis boolean indicating whether to initialize the accumulator with the mainnet genesis block
   */
  constructor(opts: AccumulatorOpts) {
    this.currentEpoch = opts.storedAccumulator.currentEpoch ?? []
    this.historicalEpochs = opts.storedAccumulator.historicalEpochs ?? []
  }

  /**
   * Returns the current height of the chain contained in the accumulator.  Assumes first block is genesis
   * so subtracts one from chain height since genesis block height is technically 0.
   */
  public currentHeight = () => {
    return this.historicalEpochs.length * EPOCH_SIZE + this.currentEpoch.length - 1
  }
}

interface AccumulatorManagerOpts {
  history: HistoryProtocol
}

export class AccumulatorManager {
  private _history: HistoryProtocol
  public headerAccumulator: HeaderAccumulator
  public _verifiers: Record<number, Uint8Array>

  constructor(opts: AccumulatorManagerOpts) {
    this._history = opts.history
    this._verifiers = {}
    this.headerAccumulator = new HeaderAccumulator({
      storedAccumulator: {
        // TODO: Hardcode "current" epoch
        currentEpoch: [],
        historicalEpochs: mainnetHistoricalEpochs,
      },
    })
  }

  public currentHeight = () => {
    return this.headerAccumulator.currentHeight()
  }

  public currentEpoch() {
    return this.headerAccumulator.currentEpoch
  }

  public getHistoricalEpochs() {
    return this.headerAccumulator.historicalEpochs
  }

  public masterAccumulator() {
    return this.headerAccumulator
  }
  public replaceAccumulator = (accumulator: HeaderAccumulator) => {
    this.headerAccumulator = accumulator
  }

  /**
   *
   * @param proof a `Proof` for a particular header's inclusion as the latest header in the accumulator's `currentEpoch`
   * @param header the blockheader being proved to be included in the `currentEpoch`
   * @param blockPosition the index in the array of `HeaderRecord`s of the header in the `currentEpoch`
   * @returns true if proof is valid, false otherwise
   */
  public verifyInclusionProof = async (proof: any, blockHash: string) => {
    const header = BlockHeader.fromRLPSerializedHeader(
      Buffer.from(
        fromHexString(
          await this._history.get(
            this._history.protocolId,
            getContentKey(ContentType.BlockHeader, fromHexString(blockHash))
          )
        )
      ),
      { hardforkByBlockNumber: true }
    )
    try {
      const _proof: SingleProof = {
        type: ProofType.single,
        gindex: blockNumberToGindex(header.number),
        leaf: proof.leaf,
        witnesses: proof.witnesses,
      }
      EpochAccumulator.createFromProof(_proof, proof.epochRoot)
    } catch (err) {
      this._history.logger(`Verify Proof FAILED: ${(err as any).mess}`)
      return false
    }
    return true
  }
  public generateInclusionProof = async (blockHash: string): Promise<HeaderProofInterface> => {
    const _blockHeader = await this._history.get(
      this._history.protocolId,
      getContentKey(ContentType.BlockHeader, fromHexString(blockHash))
    )
    if (_blockHeader === undefined) {
      throw new Error('Cannot create proof for unknown header')
    }
    const blockHeader = BlockHeader.fromRLPSerializedHeader(
      Buffer.from(fromHexString(_blockHeader)),
      {
        hardforkByBlockNumber: true,
      }
    )
    this._history.logger(`generating proof for block ${blockHeader.number}`)
    const gIndex = blockNumberToGindex(blockHeader.number)
    const epochIdx = Math.ceil(Number(blockHeader.number) / 8192)
    const listIdx = (Number(blockHeader.number) % 8192) + 1
    const epoch =
      this.headerAccumulator.historicalEpochs.length < epochIdx
        ? EpochAccumulator.serialize(this.headerAccumulator.currentEpoch.slice(0, listIdx))
        : fromHexString(
            await this._history.get(
              this._history.protocolId,
              getContentKey(
                ContentType.EpochAccumulator,
                this.headerAccumulator.historicalEpochs[epochIdx - 1]
              )
            )
          )
    const epochView = EpochAccumulator.deserializeToView(epoch)
    const proof = createProof(epochView.node, {
      type: ProofType.single,
      gindex: gIndex,
    }) as SingleProof
    const HeaderProofInterface: HeaderProofInterface = {
      epochRoot: epochView.hashTreeRoot(),
      gindex: proof.gindex,
      leaf: proof.leaf,
      witnesses: proof.witnesses,
    }
    return HeaderProofInterface
  }
  public async getHeaderRecordFromBlockhash(blockHash: string) {
    const header = BlockHeader.fromRLPSerializedHeader(
      Buffer.from(
        fromHexString(
          await this._history.get(
            this._history.protocolId,
            getContentKey(ContentType.BlockHeader, fromHexString(blockHash))
          )
        )
      ),
      { hardforkByBlockNumber: true }
    )
    const epochIndex = Math.ceil(Number(header.number) / 8192)
    const listIndex = Number(header.number) % 8192
    if (this.headerAccumulator.historicalEpochs.length < epochIndex) {
      return this.headerAccumulator.currentEpoch[listIndex]
    } else {
      const epoch = EpochAccumulator.deserialize(
        fromHexString(
          await this._history.get(
            this._history.protocolId,
            getContentKey(3, this.headerAccumulator.historicalEpochs[epochIndex - 1])
          )
        )
      )
      return epoch[listIndex]
    }
  }
}
