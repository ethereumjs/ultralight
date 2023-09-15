import { NodeId, distance } from '@chainsafe/discv5'
import { bigIntToHex, hexToBytes } from '@ethereumjs/util'
import { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import { Debugger } from 'debug'
import { MemoryLevel } from 'memory-level'
import { serializedContentKeyToContentId } from '../index.js'
import { ProtocolId } from '../index.js'

export class DBManager {
  nodeId: string
  db: AbstractLevel<string, string>
  logger: Debugger
  currentSize: () => Promise<number>
  sublevels: Map<ProtocolId, AbstractLevel<string, string>>

  constructor(
    nodeId: NodeId,
    logger: Debugger,
    currentSize: () => Promise<number>,
    sublevels: ProtocolId[] = [],
    db?: AbstractLevel<string>,
  ) {
    //@ts-ignore Because level doesn't know how to get along with itself
    this.db = db ?? new MemoryLevel()
    this.nodeId = nodeId.startsWith('0x') ? nodeId.slice(2) : nodeId
    this.logger = logger.extend('DB')
    this.currentSize = currentSize
    this.sublevels = new Map()
    for (const protocol of sublevels) {
      const sub = this.db.sublevel(protocol)
      this.sublevels.set(protocol, sub)
    }
  }

  get(protocol: ProtocolId, key: string) {
    const db = this.sublevel(protocol)
    const databaseKey = this.databaseKey(key)
    return db.get(databaseKey)
  }

  put(protocol: ProtocolId, key: string, val: string) {
    const db = this.sublevel(protocol)
    const databaseKey = this.databaseKey(key)
    return db.put(databaseKey, val, (err: any) => {
      if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
    })
  }

  batch(ops: AbstractBatchOperation<string, string, string>[], sublevel?: ProtocolId) {
    const db = sublevel ? this.sublevels.get(sublevel) ?? this.db : this.db
    return (db as any).batch(ops)
  }

  del(protocol: ProtocolId, key: string) {
    const db = this.sublevel(protocol)
    const databaseKey = this.databaseKey(key)
    return db.del(databaseKey)
  }
  databaseKey(key: string) {
    const contentId = serializedContentKeyToContentId(hexToBytes(key))
    const d = BigInt.asUintN(32, distance(contentId.slice(2), this.nodeId))
    return bigIntToHex(d)
  }

  sublevel(protocol: ProtocolId) {
    return this.sublevels.get(protocol)!
  }

  async prune(sublevel: ProtocolId, radius: bigint) {
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
