import { fromHexString, toHexString } from '@chainsafe/ssz'
import { type Block } from '@ethereumjs/block'
import { hexToBytes } from '@ethereumjs/util'

import { ContentLookup } from '../index.js'

import {
  BlockHeaderWithProof,
  EpochAccumulator,
  HistoryNetworkContentType,
  epochRootByBlocknumber,
  getContentKey,
  reassembleBlock,
} from './index.js'

import type { HistoryNetwork } from './index.js'
import type { ContentLookupResponse } from '../index.js'

export class ETH {
  network: HistoryNetwork
  constructor(network: HistoryNetwork) {
    this.network = network
  }
  public getBlockByHash = async (
    blockHash: string,
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    let lookupResponse: ContentLookupResponse
    let header: any
    let body: any
    let block
    try {
      this.network.logger.extend('getBlockByHash')(`Looking for ${blockHash} locally`)
      // Try to find block locally
      const block = await this.network.getBlockFromDB(fromHexString(blockHash), includeTransactions)
      return block
    } catch {
      /** NOOP */
    }
    const headerContentKey = hexToBytes(
      getContentKey(HistoryNetworkContentType.BlockHeader, hexToBytes(blockHash)),
    )
    const bodyContentKey = includeTransactions
      ? hexToBytes(getContentKey(HistoryNetworkContentType.BlockBody, hexToBytes(blockHash)))
      : undefined
    try {
      let lookup = new ContentLookup(this.network, headerContentKey)
      lookupResponse = await lookup.startLookup()
      this.network.logger.extend('getBlockByHash')(`Looking for ${blockHash} on the network`)
      this.network.logger.extend('getBlockByHash')(lookupResponse)
      if (!lookupResponse || !('content' in lookupResponse)) {
        return undefined
      } else {
        header = lookupResponse.content
        header = BlockHeaderWithProof.deserialize(header as Uint8Array).header
      }
      if (!includeTransactions) {
        block = reassembleBlock(header, undefined)
        return block
      } else {
        lookup = new ContentLookup(this.network, bodyContentKey!)
        lookupResponse = await lookup.startLookup()
        if (!lookupResponse || !('content' in lookupResponse)) {
          block = reassembleBlock(header)
        } else {
          body = lookupResponse.content
          block = reassembleBlock(header, body)
        }
      }
    } catch {
      /** NOOP */
    }
    return block
  }

  public getBlockByNumber = async (
    blockNumber: number | bigint,
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    let blockHash = (await this.network.blockIndex()).get('0x' + blockNumber.toString(16))
    if (blockHash === undefined) {
      const epochRootHash = epochRootByBlocknumber(BigInt(blockNumber))
      if (!epochRootHash) {
        return undefined
      }
      const lookupKey = getContentKey(HistoryNetworkContentType.EpochAccumulator, epochRootHash)
      const epoch_lookup = new ContentLookup(this.network, hexToBytes(lookupKey))
      const result = await epoch_lookup.startLookup()

      if (result && 'content' in result) {
        this.network.logger.extend(`ETH_GETBLOCKBYNUMBER`)(
          `Found EpochAccumulator with header record for block ${blockNumber}`,
        )
        const epoch = EpochAccumulator.deserialize(result.content)
        blockHash = toHexString(epoch[Number(blockNumber) % 8192].blockHash)
      }
    }
    if (blockHash === undefined) {
      return undefined
    }
    const block = await this.getBlockByHash(blockHash, includeTransactions)
    if (block?.header.number === BigInt(blockNumber)) {
      return block
    } else {
      this.network.logger(`Block ${blockNumber} not found`)
      return undefined
    }
  }
}
