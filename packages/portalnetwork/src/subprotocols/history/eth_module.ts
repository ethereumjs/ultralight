import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import {
  EpochAccumulator,
  reassembleBlock,
  HistoryProtocol,
  BlockBodyContentType,
  getContentKey,
  HistoryNetworkContentType,
  epochRootByBlocknumber,
  BlockHeaderWithProof,
} from './index.js'
import { ContentLookup, ContentLookupResponse } from '../index.js'

export class ETH {
  protocol: HistoryProtocol
  constructor(protocol: HistoryProtocol) {
    this.protocol = protocol
  }
  public getBlockByHash = async (
    blockHash: string,
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    const headerContentKey = fromHexString(
      getContentKey(HistoryNetworkContentType.BlockHeader, fromHexString(blockHash)),
    )

    const bodyContentKey = includeTransactions
      ? fromHexString(getContentKey(HistoryNetworkContentType.BlockBody, fromHexString(blockHash)))
      : undefined
    let lookupResponse: ContentLookupResponse
    let header: any
    let body: any
    let block
    try {
      let lookup = new ContentLookup(this.protocol, headerContentKey)
      lookupResponse = await lookup.startLookup()
      if (!lookupResponse || !('content' in lookupResponse)) {
        return undefined
      } else {
        header = lookupResponse.content
        header = BlockHeaderWithProof.deserialize(header as Uint8Array).header
      }
      if (!includeTransactions) {
        block = reassembleBlock(
          header,
          BlockBodyContentType.serialize({
            allTransactions: [],
            sszUncles: Uint8Array.from([]),
          }),
        )
        return block
      } else {
        lookup = new ContentLookup(this.protocol, bodyContentKey!)
        lookupResponse = await lookup.startLookup()
        if (!lookupResponse || !('content' in lookupResponse)) {
          block = reassembleBlock(header)
        } else {
          body = lookupResponse.content
          block = reassembleBlock(header, body)
        }
      }
    } catch {}
    return block
  }

  public getBlockByNumber = async (
    blockNumber: number | bigint,
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    let blockHash
    const epochRootHash = epochRootByBlocknumber(BigInt(blockNumber))
    const lookupKey = getContentKey(HistoryNetworkContentType.EpochAccumulator, epochRootHash)
    const epoch_lookup = new ContentLookup(this.protocol, fromHexString(lookupKey))
    const result = await epoch_lookup.startLookup()

    if (result && 'content' in result) {
      this.protocol.logger.extend(`ETH_GETBLOCKBYNUMBER`)(
        `Found EpochAccumulator with header record for block ${blockNumber}`,
      )
      const epoch = EpochAccumulator.deserialize(result.content)
      blockHash = toHexString(epoch[Number(blockNumber) % 8192].blockHash)

      const block = await this.getBlockByHash(blockHash, includeTransactions)
      if (block?.header.number === BigInt(blockNumber)) {
        return block
      } else {
        this.protocol.logger(`Block ${blockNumber} not found`)
        return undefined
      }
    }
  }
}
