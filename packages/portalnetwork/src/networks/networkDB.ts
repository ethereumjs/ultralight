import { distance } from '@chainsafe/discv5'
import { fromHexString } from '@chainsafe/ssz'
import { bigIntToHex, padToEven } from '@ethereumjs/util'
import debug from 'debug'
import fs from 'fs'
import { MemoryLevel } from 'memory-level'

import { type NetworkId } from './index.js'

import type { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import type { Debugger } from 'debug'

interface NetworkDBConfig {
  networkId: NetworkId
  nodeId?: string
  db?: { db: AbstractLevel<string, string>; path: string }
  logger?: Debugger
  contentId?: (contentKey: string) => string
}

export class NetworkDB {
  db: AbstractLevel<string, string>
  networkId: NetworkId
  nodeId: string
  streaming: Set<string>
  contentId: (contentKey: string) => string
  logger: Debugger
  dataDir?: string
  constructor({ networkId, nodeId, db, logger, contentId }: NetworkDBConfig) {
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
   * Derive the database key from the content key
   * @param contentKey 0x prefixed hex string
   * @returns database key
   */
  databaseKey(contentKey: string): string {
    const contentId = this.contentId(contentKey)
    const d = BigInt.asUintN(32, distance(contentId, this.nodeId))
    return bigIntToHex(d)
  }
  /**
   * Put content in the database
   * @param key Content Key - 0x prefixed hex string
   * @param val Content - 0x prefixed hex string
   */
  put(key: string, val: string) {
    if (!key.startsWith('0x')) throw new Error('Key must be 0x prefixed hex string')
    if (!val.startsWith('0x')) throw new Error('Key must be 0x prefixed hex string')
    const databaseKey = this.databaseKey(key)
    this.db.put(databaseKey, val, (err: any) => {
      if (err !== undefined) this.logger(`Error putting content in DB: ${err.toString()}`)
    })
    this.streaming.delete(key)
    this.logger(
      `Put ${key} in DB as ${databaseKey}.  Size=${fromHexString(padToEven(val)).length} bytes`,
    )
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
    const databaseKey = this.databaseKey(key)
    this.logger(`Getting ${key} from DB. dbKey: ${databaseKey}`)
    const val = await this.db.get(databaseKey)
    this.logger(
      `Got ${key} from DB with key: ${databaseKey}.  Size=${
        fromHexString(padToEven(val)).length
      } bytes`,
    )
    clearTimeout(timeout)
    return val
  }
  /**
   * Delete an entry by key.
   * @param key Content Key - 0x prefixed hex string
   */
  async del(key: string): Promise<void> {
    const databaseKey = this.databaseKey(key)
    await this.db.del(databaseKey)
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
  size(): number {
    if (this.dataDir === undefined) throw new Error('No data directory specified')
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
  async prune(radius: bigint): Promise<void> {
    for await (const key of this.db.keys({ gte: bigIntToHex(radius) })) {
      await this.db.del(key)
    }
  }
}
