import { MemoryLevel } from 'memory-level'

import type { NodeId } from '@chainsafe/enr'
import type { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import type { Debugger } from 'debug'
import type { NetworkId } from '../index.js'
import type { NetworkDB } from '../networks/networkDB.js'

export class DBManager {
  nodeId: string
  db: AbstractLevel<string, string>
  logger: Debugger
  currentSize: () => Promise<number>
  sublevels: Map<NetworkId, NetworkDB>
  constructor(
    nodeId: NodeId,
    logger: Debugger,
    currentSize: () => Promise<number>,
    db?: AbstractLevel<string>,
  ) {
    //@ts-ignore Because level doesn't know how to get along with itself
    this.db = db ?? new MemoryLevel()
    this.nodeId = nodeId.startsWith('0x') ? nodeId.slice(2) : nodeId
    this.logger = logger.extend('DB')
    this.currentSize = currentSize
    this.sublevels = new Map()
  }

  async get(key: string, network?: NetworkId) {
    if (network !== undefined) {
      const db = this.sublevel(network)
      return db.get(key)
    }
    return this.db.get(key)
  }

  async put(key: string, val: string, network?: NetworkId) {
    if (network !== undefined) {
      const db = this.sublevel(network)
      return db.put(key, val)
    }
    return this.db.put(key, val)
  }

  async storeBlockIndex(blockIndex: Map<string, string>) {
    return this.db.put('block_index', JSON.stringify(Array.from(blockIndex.entries())))
  }

  async getBlockIndex(): Promise<Map<string, string>> {
    try {
      return new Map(JSON.parse(await this.db.get('block_index')))
    } catch {
      return new Map()
    }
  }

  batch(ops: AbstractBatchOperation<string, string, string>[], sublevel?: NetworkId) {
    const db = sublevel ? (this.sublevels.get(sublevel) ?? this.db) : this.db
    return (db as any).batch(ops)
  }

  async del(key: string, network?: NetworkId) {
    if (network !== undefined) {
      const db = this.sublevel(network)
      return db.del(key)
    }
    return this.db.del(key)
  }

  sublevel(network: NetworkId) {
    return this.sublevels.get(network)!
  }

  async open() {
    await this.db.open()
    for (const sublevel of this.sublevels.values()) {
      await sublevel.open()
    }
  }

  async close() {
    this.db.removeAllListeners()
    await this.db.close()
  }

  async closeAll() {
    await this.close()
    for (const sublevel of this.sublevels.values()) {
      await sublevel.close()
    }
  }
}
