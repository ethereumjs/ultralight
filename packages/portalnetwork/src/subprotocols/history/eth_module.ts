import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import {
  EpochAccumulator,
  reassembleBlock,
  HistoryProtocol,
  BlockBodyContentType,
  getContentKey,
  ContentType,
  epochRootByBlocknumber,
  BlockHeaderWithProof,
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
    const headerContentKey = fromHexString(
      getContentKey(ContentType.BlockHeader, fromHexString(blockHash))
    )

    const bodyContentKey = includeTransactions
      ? fromHexString(
          getContentKey(
            ContentType.BlockBody,
            fromHexString(blockHash)
          )
        )
      : undefined
    let header: any
    let body: any
    let block
    try {
      let lookup = new ContentLookup(this.protocol, headerContentKey)
      header = await lookup.startLookup()
      if (!(header instanceof Uint8Array)) {
        return undefined
      } else {
        header = BlockHeaderWithProof.deserialize(header as Uint8Array).header
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
        try {
          block = reassembleBlock(header, body)
        } catch {
          block = reassembleBlock(header)
        }
      }
    } catch {}
    return block
  }

  public getBlockByNumber = async (
    blockNumber: number | bigint,
    includeTransactions: boolean
  ): Promise<Block | undefined> => {
    let blockHash
    const epochRootHash = epochRootByBlocknumber(BigInt(blockNumber))
    const lookupKey = getContentKey(
      ContentType.EpochAccumulator,
      Buffer.from(epochRootHash)
    )
    const epoch_lookup = new ContentLookup(this.protocol, fromHexString(lookupKey))
    const result = await epoch_lookup.startLookup()
    if (result === undefined || !(result instanceof Uint8Array)) {
      this.protocol.logger('eth_getBlockByNumber failed to retrieve historical epoch accumulator')
      return undefined
    }

    try {
      const epoch = EpochAccumulator.deserialize(result as Uint8Array)
      this.protocol.logger.extend(`ETH_GETBLOCKBYNUMBER`)(
        `Found EpochAccumulator with header record for block ${blockNumber}`
      )
      blockHash = toHexString(epoch[Number(blockNumber) % 8192].blockHash)

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
