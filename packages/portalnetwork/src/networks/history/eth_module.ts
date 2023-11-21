import { fromHexString } from '@chainsafe/ssz'
import { type Block } from '@ethereumjs/block'
import { hexToBytes } from '@ethereumjs/util'

import { ContentLookup } from '../index.js'

import {
  BlockHeaderWithProof,
  HistoryNetworkContentType,
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
}
