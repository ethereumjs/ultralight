import { NodeId, distance } from '@chainsafe/discv5'
import { fromHexString } from '@chainsafe/ssz'
import { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import { Debugger } from 'debug'
import { MemoryLevel } from 'memory-level'
import { ProtocolId } from '../subprotocols/index.js'

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
    db?: AbstractLevel<string>
  ) {
    //@ts-ignore Because level doesn't know how to get along with itself
    this.db = db ?? new MemoryLevel()
    this.nodeId = nodeId.startsWith('0x') ? nodeId.slice(2) : nodeId
    this.logger = logger.extend('DB')
    this.currentSize = currentSize
    this.sublevels = new Map()
    for (const protocol of sublevels) {
      const sub = this.db.sublevel(protocol)
      sub.open()
      this.sublevels.set(protocol, sub)
    }
  }

  get(key: string) {
    let db = this.db
    switch (key.slice(0, 4)) {
      case '0x00':
      case '0x01':
      case '0x02':
      case '0x03':
      case '0x04':
      case '0x05': {
        db = this.sublevels.get(ProtocolId.HistoryNetwork)!
      }
    }
    return db.get(key)
  }

  put(key: string, val: string) {
    let db = this.db
    switch (key.slice(0, 4)) {
      case '0x00':
      case '0x01':
      case '0x02':
      case '0x03':
      case '0x04':
      case '0x05': {
        db = this.sublevels.get(ProtocolId.HistoryNetwork)!
      }
    }
    return db.put(key, val, (err: any) => {
      if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
    })
  }

  batch(ops: AbstractBatchOperation<string, string, string>[], sublevel?: ProtocolId) {
    const db = sublevel ? this.sublevels.get(sublevel) ?? this.db : this.db
    return (db as any).batch(ops)
  }

  del(key: string) {
    let db = this.db
    switch (key.slice(0, 4)) {
      case '0x00':
      case '0x01':
      case '0x02':
      case '0x03':
      case '0x04':
      case '0x05': {
        db = this.sublevels.get(ProtocolId.HistoryNetwork)!
      }
    }
    return db.del(key)
  }

  async close() {
    await this.db.removeAllListeners()
    await this.db.close()
  }
}
