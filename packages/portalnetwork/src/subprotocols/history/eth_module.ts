import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import {
  HistoryNetworkContentKeyUnionType,
  EpochAccumulator,
  EPOCH_SIZE,
  reassembleBlock,
  HistoryProtocol,
  BlockBodyContentType,
} from './index.js'
import { ContentLookup } from '../index.js'

export class ETH {
  protocol: HistoryProtocol
  constructor(protocol: HistoryProtocol) {
    this.protocol = protocol
  }
  public getBlockByHash = async (
    blockHash: string,
    includeTransactions: boolean
  ): Promise<Block | undefined> => {
    const headerContentKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 0,
      value: { blockHash: fromHexString(blockHash) },
    })

    const bodyContentKey = includeTransactions
      ? HistoryNetworkContentKeyUnionType.serialize({
          selector: 1,
          value: { blockHash: fromHexString(blockHash) },
        })
      : undefined
    let header: any
    let body: any
    let block
    try {
      let lookup = new ContentLookup(this.protocol, headerContentKey)
      header = await lookup.startLookup()
      if (!header) {
        return undefined
      }
      if (!includeTransactions) {
        block = reassembleBlock(
          header,
          BlockBodyContentType.serialize({
            allTransactions: [],
            sszUncles: Uint8Array.from([]),
          })
        )
        return block
      } else {
        lookup = new ContentLookup(this.protocol, bodyContentKey!)
        body = await lookup.startLookup()
        return new Promise((resolve) => {
          if (body) {
            // Try assembling block
            try {
              block = reassembleBlock(header, body)
              resolve(block)
            } catch {}
          }
          block = reassembleBlock(header, body)
          resolve(block)
        })
      }
    } catch {}
  }

  public getBlockByNumber = async (
    blockNumber: number,
    includeTransactions: boolean
  ): Promise<Block | undefined> => {
    if (blockNumber > this.protocol.accumulator.currentHeight()) {
      this.protocol.logger(`Block number ${blockNumber} is higher than current known chain height`)
      return
    }
    let blockHash
    const blockIndex = blockNumber % EPOCH_SIZE
    if (blockNumber > 8192 * this.protocol.accumulator.historicalEpochs().length) {
      const currentEpoch = this.protocol.accumulator.currentEpoch()
      blockHash = toHexString(currentEpoch[blockIndex].blockHash)
      this.protocol.logger(`Blockhash found for BlockNumber ${blockNumber}: ${blockHash}`)
      try {
        const block = await this.getBlockByHash(blockHash, includeTransactions)
        return block
      } catch (err) {
        this.protocol.logger(`getBlockByNumber error: ${(err as any).message}`)
      }
    } else {
      const historicalEpochIndex = Math.floor(blockNumber / EPOCH_SIZE)
      const epochRootHash = this.protocol.accumulator.historicalEpochs()[historicalEpochIndex]
      if (!epochRootHash) {
        this.protocol.logger('Error with epoch root lookup')
        return
      }
      const lookupKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 3,
        value: { blockHash: epochRootHash },
      })

      const lookup = new ContentLookup(this.protocol, lookupKey)
      const result = await lookup.startLookup()
      if (result === undefined || !(result instanceof Uint8Array)) {
        this.protocol.logger('eth_getBlockByNumber failed to retrieve historical epoch accumulator')
        return undefined
      }

      try {
        const epoch = EpochAccumulator.deserialize(result)
        this.protocol.logger.extend(`ETH_GETBLOCKBYNUMBER`)(
          `Found EpochAccumulator with blockHash for block ${blockNumber}`
        )
        blockHash = toHexString(epoch[blockIndex].blockHash)

        const block = await this.getBlockByHash(blockHash, includeTransactions)
        if (block?.header.number === BigInt(blockNumber)) {
          return block
        } else if (block !== undefined) {
          this.protocol.logger(
            `eth_getBlockByNumber returned the wrong block, ${block?.header.number}`
          )
          return
        } else {
          this.protocol.logger(`eth_getBlockByNumber failed to find block`)
        }
      } catch (err: any) {
        this.protocol.logger(`eth_getBlockByNumber encountered an error: ${err.message}`)
      }
    }
  }
}
