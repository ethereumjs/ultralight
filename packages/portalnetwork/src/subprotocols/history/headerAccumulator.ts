import { createProof, SingleProof, ProofType } from '@chainsafe/persistent-merkle-tree'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { BlockHeader } from '@ethereumjs/block'
import {
  blockNumberToGindex,
  ContentLookup,
  EpochAccumulator,
  EPOCH_SIZE,
  getHistoryNetworkContentId,
  HeaderAccumulatorType,
  HeaderProofInterface,
  HeaderRecordType,
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
  HistoryProtocol,
  SszProof,
} from '../index.js'

export interface AccumulatorOpts {
  initFromGenesis?: boolean
  storedAccumulator?: {
    historicalEpochs: Uint8Array[]
    currentEpoch: HeaderRecordType[]
  }
}
export class HeaderAccumulator {
  private _currentEpoch: HeaderRecordType[]
  private _historicalEpochs: Uint8Array[]

  /**
   *
   * @param initFromGenesis boolean indicating whether to initialize the accumulator with the mainnet genesis block
   */
  constructor(opts: AccumulatorOpts) {
    this._currentEpoch = []
    this._historicalEpochs = []
    if (opts.initFromGenesis) {
      const genesisHeaderRlp =
        '0xf90214a00000000000000000000000000000000000000000000000000000000000000000a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347940000000000000000000000000000000000000000a0d7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000850400000000808213888080a011bbe8db4e347b4e8c937c1c8370e4b5ed33adb3db69cbdb7a38e1e50b1b82faa00000000000000000000000000000000000000000000000000000000000000000880000000000000042'
      const genesisHeader = BlockHeader.fromRLPSerializedHeader(
        Buffer.from(fromHexString(genesisHeaderRlp)),
        { hardforkByBlockNumber: true }
      )
      this.updateAccumulator(genesisHeader)
    } else if (opts.storedAccumulator) {
      this._currentEpoch = opts.storedAccumulator.currentEpoch
      this._historicalEpochs = opts.storedAccumulator.historicalEpochs
    }
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
    return this._currentEpoch.push(headerRecord) - 1
  }

  /**
   * Returns the current height of the chain contained in the accumulator.  Assumes first block is genesis
   * so subtracts one from chain height since genesis block height is technically 0.
   */
  public currentHeight = () => {
    return this.historicalEpochs.length * EPOCH_SIZE + this.currentEpoch.length - 1
  }
}

interface AccumulatorManagerOpts extends AccumulatorOpts {
  history: HistoryProtocol
}

export class AccumulatorManager {
  private _history: HistoryProtocol
  public headerAccumulator: HeaderAccumulator
  public _verifiers: Record<number, Uint8Array>

  constructor(opts: AccumulatorManagerOpts) {
    this._history = opts.history
    this._verifiers = {}
    this.headerAccumulator = new HeaderAccumulator(opts)
    this.init()
  }

  public updateAccumulator(newHeader: BlockHeader) {
    this.headerAccumulator.updateAccumulator(newHeader)
  }

  public currentHeight() {
    return this.headerAccumulator.currentHeight()
  }

  public currentEpoch() {
    return this.headerAccumulator.currentEpoch
  }

  public historicalEpochs() {
    return this.headerAccumulator.historicalEpochs
  }

  public masterAccumulator() {
    return this.headerAccumulator
  }
  public replaceAccumulator = (accumulator: HeaderAccumulator) => {
    this.headerAccumulator = accumulator
  }
  async init() {
    let storedAccumulator
    try {
      storedAccumulator = await this._history.client.db.get(
        getHistoryNetworkContentId(1, HistoryNetworkContentTypes.HeaderAccumulator)
      )
    } catch {}

    if (storedAccumulator) {
      const accumulator = HeaderAccumulatorType.deserialize(fromHexString(storedAccumulator))
      return new HeaderAccumulator({
        storedAccumulator: {
          historicalEpochs: accumulator.historicalEpochs,
          currentEpoch: accumulator.currentEpoch,
        },
      })
    } else {
      return new HeaderAccumulator({ initFromGenesis: true })
    }
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
          await this._history.client.db.get(getHistoryNetworkContentId(1, 0, blockHash))
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
    const _blockHeader = await this._history.client.db.get(
      getHistoryNetworkContentId(1, HistoryNetworkContentTypes.BlockHeader, blockHash)
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
            await this._history.client.db.get(
              getHistoryNetworkContentId(
                1,
                HistoryNetworkContentTypes.EpochAccumulator,
                toHexString(this.headerAccumulator.historicalEpochs[epochIdx - 1])
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
          await this._history.client.db.get(getHistoryNetworkContentId(1, 0, blockHash))
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
          await this._history.client.db.get(
            getHistoryNetworkContentId(
              1,
              3,
              toHexString(this.headerAccumulator.historicalEpochs[epochIndex - 1])
            )
          )
        )
      )
      return epoch[listIndex]
    }
  }
  public verifySnapshot = async (snapshot: HeaderAccumulator) => {
    const threshold = snapshot.historicalEpochs.length < 3 ? snapshot.historicalEpochs.length : 3
    this._history.logger(`Need ${threshold} votes to validate`)
    let votes = 0
    for (let i = 0; i < Object.entries(this._verifiers).length; i++) {
      const blockHash = Object.values(this._verifiers)[i]

      const proofLookupKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: HistoryNetworkContentTypes.HeaderProof,
        value: {
          chainId: 1,
          blockHash: blockHash,
        },
      })
      const proofLookup = new ContentLookup(this._history, proofLookupKey)
      const _proof = await proofLookup.startLookup()
      if (_proof) {
        const proof = SszProof.deserialize(_proof as Uint8Array)
        if (!(await this.verifyInclusionProof(proof, toHexString(blockHash)))) {
          this._history.logger('HeaderRecord not Verified')
          return false
        } else {
          votes++
          this._history.logger('HeaderRecord Verified')
        }
      } else {
        return false
      }
    }
    if (votes >= threshold) {
      this._history.client.emit('Verified', '', true)
      return true
    } else {
      this._history.client.emit('Verified', '', false)
      return false
    }
  }
  public receiveSnapshot = async (decoded: Uint8Array) => {
    try {
      const receivedAccumulator = HeaderAccumulatorType.deserialize(decoded)
      const newAccumulator = new HeaderAccumulator({
        initFromGenesis: false,
        storedAccumulator: {
          historicalEpochs: receivedAccumulator.historicalEpochs,
          currentEpoch: receivedAccumulator.currentEpoch,
        },
      })
      this._history.logger(
        `Received an accumulator snapshot with ${receivedAccumulator.currentEpoch.length} headers in the current epoch`
      )
      if (this.headerAccumulator.currentHeight() < newAccumulator.currentHeight()) {
        // If we don't have an accumulator, adopt the snapshot received
        // TODO: Decide how to verify if this snapshot is trustworthy
        try {
          this._history.logger('Verifying HeaderAccumulator snapshot')
          const verified = await this.verifySnapshot(newAccumulator)
          verified
            ? this._history.logger('Header Snapshot validated')
            : this._history.logger('Snapshot not verified -- Saving an unverified accumulator')
        } catch {
          throw new Error('Verify Snapshot failed')
        }
        //
        this._history.logger(
          'Replacing Accumulator of height',
          this.headerAccumulator.currentHeight(),
          'with Accumulator of height',
          newAccumulator.currentHeight()
        )
        this._history.client.db.put(getHistoryNetworkContentId(1, 4), toHexString(decoded))
        this.replaceAccumulator(newAccumulator)
      }
    } catch (err: any) {
      this._history.logger(`Error parsing accumulator snapshot: ${err.message}`)
    }
  }
}
