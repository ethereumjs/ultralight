import { NodeId, distance } from '@chainsafe/discv5'
import { bigIntToHex, hexToBytes } from '@ethereumjs/util'
import { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import { Debugger } from 'debug'
import { MemoryLevel } from 'memory-level'
import { serializedContentKeyToContentId } from '../index.js'
import { NetworkId } from '../index.js'

export class DBManager {
  nodeId: string
  db: AbstractLevel<string, string>
  logger: Debugger
  currentSize: () => Promise<number>
  sublevels: Map<NetworkId, AbstractLevel<string, string>>

  constructor(
    nodeId: NodeId,
    logger: Debugger,
    currentSize: () => Promise<number>,
    sublevels: NetworkId[] = [],
    db?: AbstractLevel<string>,
  ) {
    //@ts-ignore Because level doesn't know how to get along with itself
    this.db = db ?? new MemoryLevel()
    this.nodeId = nodeId.startsWith('0x') ? nodeId.slice(2) : nodeId
    this.logger = logger.extend('DB')
    this.currentSize = currentSize
    this.sublevels = new Map()
    for (const network of sublevels) {
      const sub = this.db.sublevel(network)
      this.sublevels.set(network, sub)
    }
  }

  get(network: NetworkId, key: string) {
    const db = this.sublevel(network)
    const databaseKey = this.databaseKey(key)
    return db.get(databaseKey)
  }

  put(network: NetworkId, key: string, val: string) {
    const db = this.sublevel(network)
    const databaseKey = this.databaseKey(key)
    return db.put(databaseKey, val, (err: any) => {
      if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
    })
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
    const db = sublevel ? this.sublevels.get(sublevel) ?? this.db : this.db
    return (db as any).batch(ops)
  }

  del(network: NetworkId, key: string) {
    const db = this.sublevel(network)
    const databaseKey = this.databaseKey(key)
    return db.del(databaseKey)
  }
  databaseKey(key: string) {
    const contentId = serializedContentKeyToContentId(hexToBytes(key))
    const d = BigInt.asUintN(32, distance(contentId.slice(2), this.nodeId))
    return bigIntToHex(d)
  }

  sublevel(network: NetworkId) {
    return this.sublevels.get(network)!
  }

  async prune(sublevel: NetworkId, radius: bigint) {
    const db = this.sublevels.get(sublevel)
    if (!db) return
    for await (const key of db.keys({ gte: bigIntToHex(radius) })) {
      db.del(key)
    }
  }

  async open() {
    await this.db.open()
    for (const sublevel of this.sublevels.values()) {
      await sublevel.open()
    }
  }

  async close() {
    await this.db.removeAllListeners()
    await this.db.close()
  }

  async closeAll() {
    await this.close()
  }
}
