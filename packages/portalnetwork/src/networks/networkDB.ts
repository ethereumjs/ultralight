import { distance } from '@chainsafe/discv5'
import { ContainerType, UintBigintType } from '@chainsafe/ssz'
import { bytesToHex, hexToBytes, padToEven } from '@ethereumjs/util'
import debug from 'debug'
import { MemoryLevel } from 'memory-level'

import { type NetworkId } from './index.js'

import type { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import type { Debugger } from 'debug'

interface NetworkDBConfig {
  networkId: NetworkId
  nodeId?: string
  db?: { db: AbstractLevel<string, string>; path: string }
  logger?: Debugger
  contentId?: (contentKey: Uint8Array) => string
  maxStorage?: number
}

export class NetworkDB {
  db: AbstractLevel<string, string>
  maxStorage: number
  networkId: NetworkId
  nodeId: string
  streaming: Set<string>
  contentId: (contentKey: Uint8Array) => string
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
      function (contentKey: Uint8Array) {
        return bytesToHex(contentKey)
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
  async put(key: string | Uint8Array, val: string | Uint8Array) {
    if (key instanceof Uint8Array) {
      key = bytesToHex(key)
    }
    if (val instanceof Uint8Array) {
      val = bytesToHex(val)
    }
    if (!key.startsWith('0x')) throw new Error('Key must be 0x prefixed hex string')
    if (!val.startsWith('0x')) throw new Error('Key must be 0x prefixed hex string')
    try {
      await this.db.put(key, val)
    } catch (err: any) {
      this.logger(`Error putting content in DB: ${err.toString()}`)
    }
    this.streaming.delete(key)
    this.logger(`Put ${key} in DB.  Size=${hexToBytes(padToEven(val)).length} bytes`)
  }
  /**
   * Get a value from the database by key.
   * @param key Content Key 0x prefixed hex string
   * @returns content as 0x prefixed hex string
   */
  async get(key: string | Uint8Array) {
    if (key instanceof Uint8Array) {
      key = bytesToHex(key)
    }
    // this.streaming is a Set of contentKeys currently streaming over uTP
    // the timeout is a safety measure to prevent the while loop from running indefinitely in case of a uTP stream failure
    if (this.streaming.has(key)) {
      this.logger(`Content ${key}.  currently streaming`)
    }
    const timeout = setTimeout(() => {
      this.streaming.delete(<string>key)
    }, 1000)
    while (this.streaming.has(key)) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    this.logger(`Getting ${key} from DB`)
    const val = await this.db.get(key)
    this.logger(
      `Got ${key} from DB with key: ${key}.  Size=${hexToBytes(padToEven(val)).length} bytes`,
    )
    clearTimeout(timeout)
    return val
  }
  /**
   * Delete an entry by key.
   * @param key Content Key - 0x prefixed hex string
   */
  async del(key: string | Uint8Array): Promise<void> {
    if (key instanceof Uint8Array) {
      key = bytesToHex(key)
    }
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
    let size = 0
    for await (const [key, value] of this.db.iterator()) {
      try {
        size += hexToBytes('0x' + padToEven(key.slice(2))).length
        size += hexToBytes(value).length
      } catch {
        // ignore
      }
    }
    return size
  }

  /**
   * Add content key to streaming buffer
   * @param key Content Key - 0x prefixed hex string
   */
  addToStreaming(key: string | Uint8Array): void {
    if (key instanceof Uint8Array) {
      key = bytesToHex(key)
    }
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
      const d = distance(this.nodeId, this.contentId(hexToBytes(key)))
      // If content is out of radius -- delete content
      if (d > radius) {
        // Before deleting BlockHeaderWithProof (0x00) -- Check if BlockHeaderByNumber contentKey is in radius
        if (key.startsWith('0x00')) {
          // First find the block number from block index
          const blockHash = '0x' + key.slice(4)
          const blockNumber = blockIndex.get(blockHash)!
          const numberKey = Uint8Array.from([
            0x03,
            ...new ContainerType({ blockNumber: new UintBigintType(8) }).serialize({
              blockNumber: BigInt(blockNumber),
            }),
          ])
          const numberId = this.contentId(numberKey)
          const numberDistance = distance(this.nodeId, numberId)

          // If BOTH content keys are out of radius -- delete BlockHeaderWithProof.  Add both keys to delete list (for gossip)
          if (numberDistance > radius) {
            toDelete.push([bytesToHex(numberKey), value])
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
