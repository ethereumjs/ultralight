import { toHexString, fromHexString } from '@chainsafe/ssz'
import { BlockHeader, Block } from '@ethereumjs/block'
import { Debugger } from 'debug'
import {
  getContentKey,
  ContentType,
  HistoryProtocol,
  reassembleBlock,
  BlockHeaderWithProof,
} from './index.js'
import { ContentLookup } from '../index.js'
import { shortId } from '../../index.js'

export class ContentManager {
  history: HistoryProtocol
  logger: Debugger
  radius: bigint
  constructor(history: HistoryProtocol, radius: bigint) {
    this.history = history
    this.logger = this.history.logger.extend('DB')
    this.radius = radius
  }

  public async addBlockBody(value: Uint8Array, hashKey: string) {
    const bodyKey = getContentKey(ContentType.BlockBody, fromHexString(hashKey))
    if (value.length === 0) {
      // Occurs when `getBlockByHash` called `includeTransactions` === false
      return
    }
    let block: Block | undefined
    try {
      const headerContentKey = getContentKey(ContentType.BlockHeader, fromHexString(hashKey))
      const headerWith = await this.history.client.db.get(headerContentKey)
      const hexHeader = BlockHeaderWithProof.deserialize(fromHexString(headerWith)).header
      // Verify we can construct a valid block from the header and body provided
      block = reassembleBlock(hexHeader, value)
    } catch {
      this.logger(`Block Header for ${shortId(hashKey)} not found locally.  Querying network...`)
      block = await this.history.ETH.getBlockByHash(hashKey, false)
    }
    if (block instanceof Block) {
      this.history.client.db.put(bodyKey, toHexString(value))
      this.logger.extend('BLOCK_BODY')(`added for block #${block!.header.number}`)
      block.transactions.length > 0 && (await this.history.receiptManager.saveReceipts(block!))
    } else {
      this.logger(`Could not verify block content`)
      // Don't store block body where we can't assemble a valid block
      return
    }
  }
}
