import { distance } from '@chainsafe/discv5'
import { ContainerType, UintBigintType, fromHexString, toHexString } from '@chainsafe/ssz'
import { padToEven } from '@ethereumjs/util'
import debug from 'debug'
import fs from 'fs'
import { MemoryLevel } from 'memory-level'

import { HistoryNetworkContentType, type NetworkId } from './index.js'

import type { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import type { Debugger } from 'debug'

interface NetworkDBConfig {
  networkId: NetworkId
  nodeId?: string
  db?: { db: AbstractLevel<string, string>; path: string }
  logger?: Debugger
  contentId?: (contentKey: string) => string
  maxStorage?: number
}

export class NetworkDB {
  db: AbstractLevel<string, string>
  maxStorage: number
  networkId: NetworkId
  nodeId: string
  streaming: Set<string>
  contentId: (contentKey: string) => string
  logger: Debugger
  dataDir?: string
  constructor({ networkId, nodeId, db, logger, contentId, maxStorage }: NetworkDBConfig) {
    this.networkId = networkId
    this.nodeId = nodeId ?? '0'.repeat(64)
    this.db = db?.db ?? (new MemoryLevel() as any)
    this.dataDir = db?.path
    this.streaming = new Set()
    this.logger = logger?.extend('DB') ?? debug(`${this.networkId}DB`)
    this.contentId =
      contentId ??
      function (contentKey: string) {
        return contentKey
      }
    this.maxStorage = maxStorage ?? 1024
  }

  /**
   * Open the database
   */
  async open() {
    await this.db.open()
  }

  /**
   * Close the database
   */
  async close() {
    this.db.removeAllListeners()
    await this.db.close()
  }
  /**
   * Put content in the database
   * @param key Content Key - 0x prefixed hex string
   * @param val Content - 0x prefixed hex string
   */
  async put(key: string, val: string) {
    if (!key.startsWith('0x')) throw new Error('Key must be 0x prefixed hex string')
    if (!val.startsWith('0x')) throw new Error('Key must be 0x prefixed hex string')
    try {
      await this.db.put(key, val)
    } catch (err: any) {
      this.logger(`Error putting content in DB: ${err.toString()}`)
    }
    this.streaming.delete(key)
    this.logger(`Put ${key} in DB.  Size=${fromHexString(padToEven(val)).length} bytes`)
  }
  /**
   * Get a value from the database by key.
   * @param key Content Key 0x prefixed hex string
   * @returns content as 0x prefixed hex string
   */
  async get(key: string) {
    // this.streaming is a Set of contentKeys currently streaming over uTP
    // the timeout is a safety measure to prevent the while loop from running indefinitely in case of a uTP stream failure
    this.logger(`Content ${key}.  Streaming=${this.streaming.has(key)}`)
    const timeout = setTimeout(() => {
      this.streaming.delete(key)
    }, 1000)
    while (this.streaming.has(key)) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    this.logger(`Getting ${key} from DB`)
    const val = await this.db.get(key)
    this.logger(
      `Got ${key} from DB with key: ${key}.  Size=${fromHexString(padToEven(val)).length} bytes`,
    )
    clearTimeout(timeout)
    return val
  }
  /**
   * Delete an entry by key.
   * @param key Content Key - 0x prefixed hex string
   */
  async del(key: string): Promise<void> {
    await this.db.del(key)
  }
  /**
   * Perform multiple put and/or del operations in bulk.
   * @param ops Array of operations
   */
  async batch(ops: AbstractBatchOperation<string, string, string>[]): Promise<void> {
    await this.db.batch(ops as any)
  }
  /**
   * Find the size of the data directory
   * @returns the size of the data directory in bytes
   */
  async size(): Promise<number> {
    if (this.dataDir === undefined) {
      const _db = this.db as MemoryLevel<string, string>
      let size = 0
      for await (const [key, value] of _db.iterator()) {
        size += fromHexString('0x' + padToEven(key.slice(2))).length
        size += fromHexString(value).length
      }
      return size
    }
    try {
      const files = fs.readdirSync(this.dataDir)
      let size = 0
      for (const file of files) {
        const stats = fs.lstatSync(this.dataDir + '/' + file)
        size += stats.size
      }
      return size
    } catch (err: any) {
      throw new Error(`Error reading data directory: ${err.toString()}`)
    }
  }

  /**
   * Add content key to streaming buffer
   * @param key Content Key - 0x prefixed hex string
   */
  addToStreaming(key: string): void {
    this.logger(`Adding ${key} to streaming`)
    this.streaming.add(key)
  }
  /**
   * Prune DB content to a new radius
   * @param radius node radius
   */
  async prune(
    radius: bigint,
    blockIndex: Map<string, string> = new Map(),
  ): Promise<[string, string][]> {
    const toDelete: [string, string][] = []
    for await (const [key, value] of this.db.iterator()) {
      // Calculate distance between node and content
      const d = distance(this.nodeId, this.contentId(key))
      // If content is out of radius -- delete content
      if (d > radius) {
        // Before deleting BlockHeaderWithProof (0x00) -- Check if BlockHeaderByNumber contentKey is in radius
        if (key.startsWith('0x00')) {
          // First find the block number from block index
          const blockHash = '0x' + key.slice(4)
          const blockNumber = blockIndex.get(blockHash)!
          const numberKey = Uint8Array.from([
            HistoryNetworkContentType.BlockHeaderByNumber,
            ...new ContainerType({ blockNumber: new UintBigintType(8) }).serialize({
              blockNumber: BigInt(blockNumber),
            }),
          ])
          const numberId = this.contentId(toHexString(numberKey))
          const numberDistance = distance(this.nodeId, numberId)

          // If BOTH content keys are out of radius -- delete BlockHeaderWithProof.  Add both keys to delete list (for gossip)
          if (numberDistance > radius) {
            toDelete.push([toHexString(numberKey), value])
            toDelete.push([key, value])
            await this.db.del(key)
          }
        } else {
          toDelete.push([key, value])
          await this.db.del(key)
        }
      }
    }
    return toDelete
  }
}
