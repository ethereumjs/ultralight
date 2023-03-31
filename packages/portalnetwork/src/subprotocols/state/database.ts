import { fromHexString, toHexString } from '@chainsafe/ssz'
import { DefaultStateManager } from '@ethereumjs/statemanager'
import { DB, BatchDBOp, Trie } from '@ethereumjs/trie'
import { Account, Address } from '@ethereumjs/util'
import { AbstractLevel, NodeCallback } from 'abstract-level'
import { MemoryLevel } from 'memory-level'
import { StateRootIndex } from './stateroots.js'
import { AccountTrieProof, AccountTrieProofKey, StateRoot, StateRootHex } from './types.js'

export type TrieDB = MemoryLevel | AbstractLevel<string, string>
export type TrieLevelStatus = 'opening' | 'open' | 'closing' | 'closed'
export type Addr = string
export type AddressRoots = Map<Addr, StateRootHex[]>
export type AccountRecord = { address: Addr; accounts: Record<StateRootHex, Account> }
export type AddressRecord = [Addr, AccountRecord]
export class TrieLevel implements DB {
  db: TrieDB

  constructor(database?: TrieDB) {
    this.db = database ?? new MemoryLevel({ createIfMissing: true })
  }
  async open(_callback?: NodeCallback<void>): Promise<void> {
    this.db.open()
  }
  async close(_callback?: NodeCallback<void>): Promise<void> {
    this.db.close()
  }
  get status(): TrieLevelStatus {
    return this.db.status
  }
  async get(key: Buffer): Promise<Buffer | null> {
    try {
      return Buffer.from(fromHexString(await this.db.get(toHexString(key))))
    } catch {
      return null
    }
  }
  async put(key: Buffer, val: Buffer): Promise<void> {
    await this.db.put(toHexString(key), toHexString(val))
  }
  async del(key: Buffer): Promise<void> {
    await this.db.del(toHexString(key))
  }
  async batch(opStack: BatchDBOp[]): Promise<void> {
    for (const op of opStack) {
      if (op.type === 'del') {
        await this.del(op.key)
      }

      if (op.type === 'put') {
        await this.put(op.key, op.value)
      }
    }
  }
  async size(): Promise<number> {
    let size = 0
    for await (const [k, v] of this.db.iterator()) {
      size += fromHexString(k).length + fromHexString(v).length
    }
    return size
  }
  copy(): DB {
    return new TrieLevel(this.db)
  }
}
