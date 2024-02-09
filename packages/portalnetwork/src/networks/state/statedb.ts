import { fromHexString, toHexString } from '@chainsafe/ssz'
import { MapDB } from '@ethereumjs/util'
import { MemoryLevel } from 'memory-level'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeRetrieval,
  ContractCodeContentKey,
  ContractRetrieval,
  NetworkId,
  StateNetworkContentId,
  StateNetworkContentType,
  StorageTrieNodeContentKey,
  StorageTrieNodeRetrieval,
  compareDistance,
  keyType,
} from '../index.js'

import type { StateNetwork } from './state.js'
import type { BatchDBOp, DB } from '@ethereumjs/util'
import type { Debugger } from 'debug'
export class PortalTrieDB extends MapDB<string, Uint8Array> implements DB<string, Uint8Array> {
  db: MemoryLevel<string, Uint8Array>
  constructor(db?: MemoryLevel<string, Uint8Array>) {
    super()
    this.db =
      db ??
      new MemoryLevel({
        createIfMissing: true,
        valueEncoding: 'view',
      })
  }
  async get(key: string) {
    return this.db.get(key)
  }
  async put(key: string, value: Uint8Array) {
    return this.db.put(key, value)
  }
  async del(key: string) {
    return this.db.del(key)
  }
  async batch(opStack: BatchDBOp<string, Uint8Array>[]): Promise<void> {
    for (const op of opStack) {
      if (op.type === 'del') {
        await this.del(op.key)
      }

      if (op.type === 'put') {
        await this.put(op.key, op.value)
      }
    }
  }
}
function getDatabaseContent(contentKey: Uint8Array, content: Uint8Array) {
  const type = keyType(contentKey)
  let dbContent = new Uint8Array()
  switch (type) {
    case StateNetworkContentType.AccountTrieNode:
      dbContent = AccountTrieNodeRetrieval.deserialize(content).node
      break
    case StateNetworkContentType.ContractTrieNode:
      dbContent = StorageTrieNodeRetrieval.deserialize(content).node
      break
    case StateNetworkContentType.ContractByteCode:
      dbContent = ContractRetrieval.deserialize(content).code
      break
  }
  return toHexString(dbContent)
}
function getDatabaseKey(contentKey: Uint8Array) {
  const type = keyType(contentKey)
  let dbKey = contentKey
  switch (type) {
    case StateNetworkContentType.AccountTrieNode:
      dbKey = AccountTrieNodeContentKey.decode(contentKey).nodeHash
      break
    case StateNetworkContentType.ContractTrieNode:
      dbKey = StorageTrieNodeContentKey.decode(contentKey).nodeHash
      break
    case StateNetworkContentType.ContractByteCode:
      dbKey = ContractCodeContentKey.decode(contentKey).codeHash
      break
    default:
      break
  }
  return toHexString(dbKey)
}
export class StateDB {
  db: PortalTrieDB
  logger: Debugger | undefined
  state: StateNetwork
  blocks: Map<number, string>
  stateRoots: Map<string, string>
  closestId: Map<string, Uint8Array>
  constructor(state: StateNetwork) {
    this.db = new PortalTrieDB()
    this.state = state
    this.logger = state?.logger.extend('StateDB')
    this.stateRoots = new Map()
    this.blocks = new Map()
    this.closestId = new Map()
  }

  /**
   * Store content by content key
   * @param contentKey
   * @param content
   * @returns true if content is stored successfully
   */
  async storeContent(contentKey: Uint8Array, content: Uint8Array) {
    const dbKey = getDatabaseKey(contentKey)
    const dbContent = getDatabaseContent(contentKey, content)
    this.state.put(NetworkId.StateNetwork, dbKey, dbContent)
    return true
  }

  /**
   * Get content by content key
   * @param contentKey
   * @returns stored content or undefined
   */
  async getContent(contentKey: Uint8Array): Promise<Uint8Array | undefined> {
    const dbKey = getDatabaseKey(contentKey)
    const content = await this.state.retrieve(dbKey)
    if (content === undefined) {
      return undefined
    }
    if (content !== undefined && !this.closestId.has(toHexString(contentKey))) {
      this.logger && this.logger(`INFO: content found but arrived via a different content key.`)
    }
    return fromHexString(content)
  }

  async updateClosestId(contentKey: Uint8Array): Promise<Uint8Array> {
    let contentId = StateNetworkContentId.fromBytes(contentKey)
    if (this.closestId.has(toHexString(contentKey))) {
      contentId = compareDistance(
        this.state.enr.nodeId,
        contentId,
        this.closestId.get(toHexString(contentKey))!,
      )
    }
    this.closestId.set(toHexString(contentKey), contentId)
    return contentId
  }

  storeBlock({
    blockHash,
    blockNumber,
    stateRoot,
  }: {
    blockHash: Uint8Array
    stateRoot?: Uint8Array
    blockNumber?: number
  }) {
    if (blockNumber !== undefined) {
      this.blocks.set(blockNumber, toHexString(blockHash))
    }
    if (stateRoot !== undefined) {
      this.stateRoots.set(toHexString(blockHash), toHexString(stateRoot))
    }
  }
}
