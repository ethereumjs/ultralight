import { BranchMPTNode, LeafMPTNode, MPTNode, MerklePatriciaTrie as Trie } from '@ethereumjs/mpt'
import { bytesToUnprefixedHex } from '@ethereumjs/util'
import { bytesToHex } from 'ethereum-cryptography/utils'

import { ContentLookup } from '../contentLookup.js'

import { addressToNibbles, packNibbles, unpackNibbles } from './nibbleEncoding.js'
import { PortalTrieDB } from './portalTrieDB.js'
import { AccountTrieNodeRetrieval, StorageTrieNodeRetrieval } from './types.js'
import {
  decodeAccountTrieNodeContentKey,
  decodeStorageTrieNodeContentKey,
  encodeAccountTrieNodeContentKey,
  encodeStorageTrieNodeContentKey,
} from './util.js'

import type { Path } from '@ethereumjs/mpt'
import type { Debugger } from 'debug'
import type { StateManager } from './manager.js'
import type { StateNetwork } from './state.js'

export class PortalTrie {
  state: StateNetwork
  db: PortalTrieDB
  logger: Debugger
  constructor(stateManager: StateManager) {
    this.state = stateManager.state
    this.logger = stateManager.state.logger.extend('PortalTrie')
    this.db = new PortalTrieDB(this.state.db.db, this.logger)
  }
  async lookupAccountTrieNode(key: Uint8Array) {
    const lookup = new ContentLookup(this.state, key)
    const request = await lookup.startLookup()
    const keyobj = decodeAccountTrieNodeContentKey(key)
    if (request === undefined || !('content' in request)) {
      throw new Error(
        `network doesn't have node [${unpackNibbles(keyobj.path)}]${bytesToHex(keyobj.nodeHash)}`,
      )
    }
    const node = AccountTrieNodeRetrieval.deserialize(request.content).node
    return { nodeHash: keyobj.nodeHash, node }
  }
  async lookupStorageTrieNode(key: Uint8Array) {
    const lookup = new ContentLookup(this.state, key)
    const request = await lookup.startLookup()
    const keyobj = decodeStorageTrieNodeContentKey(key)
    if (request === undefined || !('content' in request)) {
      throw new Error(
        `network doesn't have node [${unpackNibbles(keyobj.path)}]${bytesToHex(keyobj.nodeHash)}`,
      )
    }
    const node = StorageTrieNodeRetrieval.deserialize(request.content).node
    return { nodeHash: keyobj.nodeHash, node }
  }
  async findAccountPath(stateroot: Uint8Array, address: Uint8Array) {
    const lookupTrie = new Trie({
      useKeyHashing: true,
      db: this.db,
    })
    lookupTrie.root(stateroot)
    const addressPath = addressToNibbles(address)

    // Find RootNode
    const rootNodeKey = encodeAccountTrieNodeContentKey({
      path: packNibbles([]),
      nodeHash: stateroot,
    })

    const lookup = new ContentLookup(this.state, rootNodeKey)
    const request = await lookup.startLookup()
    if (request === undefined || !('content' in request)) {
      this.logger(`network doesn't have root node ${bytesToHex(stateroot)}`)
      return undefined
    }
    const node = AccountTrieNodeRetrieval.deserialize(request.content).node
    this.logger.extend('findPath')(`RootNode found: (${node.length} bytes)`)
    this.db.temp.set(bytesToUnprefixedHex(stateroot), bytesToUnprefixedHex(node))

    // Find Account via trie walk
    let accountPath = await lookupTrie.findPath(lookupTrie['hash'](address))

    while (accountPath.node === null) {
      const nextPath = await this._findNextAccountPath(
        accountPath,
        addressPath,
        address,
        lookupTrie,
      )
      if (nextPath.stack.length === accountPath.stack.length) {
        return { ...nextPath }
      }
      accountPath = nextPath
    }
    return { ...accountPath }
  }

  async _findNextAccountPath(
    accountPath: Path,
    addressPath: string[],
    address: Uint8Array,
    lookupTrie: Trie,
  ) {
    const consumedNibbles = accountPath.stack
      .slice(1)
      .map((n) => (n instanceof BranchMPTNode ? 1 : n.keyLength()))
      .reduce((a, b) => a + b, 0)
    const nodePath = addressPath.slice(0, consumedNibbles + 1)
    this.logger.extend('findPath')(`consumed nibbles: ${consumedNibbles}`)
    this.logger.extend('findPath')(`Looking for next node in path [${nodePath}]`)
    const current = accountPath.stack[accountPath.stack.length - 1]
    if (current instanceof LeafMPTNode) {
      return { ...accountPath }
    }
    const nextNodeHash =
      current instanceof BranchMPTNode
        ? current.getBranch(Number.parseInt(addressPath[consumedNibbles], 16))
        : current.value()

    if (nextNodeHash === undefined || nextNodeHash === null) {
      return { ...accountPath }
    }
    this.logger.extend('findPath')(`Looking for node: [${bytesToHex(nextNodeHash as Uint8Array)}]`)
    const nextContentKey = encodeAccountTrieNodeContentKey({
      path: packNibbles(nodePath),
      nodeHash: nextNodeHash as Uint8Array,
    })
    const found = await this.lookupAccountTrieNode(nextContentKey)
    this.logger.extend('findPath')(
      `Found node: [${bytesToHex(found.nodeHash)}] (${found.node.length} bytes)`,
    )
    this.db.temp.set(bytesToUnprefixedHex(found.nodeHash), bytesToUnprefixedHex(found.node))
    const nextPath = await lookupTrie.findPath(lookupTrie['hash'](address))
    return nextPath
  }

  async findContractPath(storageRoot: Uint8Array, slot: Uint8Array, address: Uint8Array) {
    const lookupTrie = new Trie({
      useKeyHashing: true,
      db: this.db,
    })
    lookupTrie.root(storageRoot)
    const addressPath = addressToNibbles(slot)

    // Find RootNode
    const rootNodeKey = encodeStorageTrieNodeContentKey({
      path: packNibbles([]),
      nodeHash: storageRoot,
      addressHash: new Trie({ useKeyHashing: true })['hash'](address),
    })

    const lookup = new ContentLookup(this.state, rootNodeKey)
    const request = await lookup.startLookup()
    if (request === undefined || !('content' in request)) {
      throw new Error(`network doesn't have root node ${bytesToHex(storageRoot)}`)
    }
    const node = AccountTrieNodeRetrieval.deserialize(request.content).node
    this.logger.extend('findPath')(`RootNode found: (${node.length} bytes)`)
    this.db.temp.set(bytesToUnprefixedHex(storageRoot), bytesToUnprefixedHex(node))

    // Find Account via trie walk
    let contractPath = await lookupTrie.findPath(lookupTrie['hash'](slot))

    while (contractPath.node === null) {
      const nextPath = await this._findNextContractPath(
        contractPath,
        addressPath,
        address,
        slot,
        lookupTrie,
      )
      if (nextPath.stack.length === contractPath.stack.length) {
        return { ...nextPath }
      }
      contractPath = nextPath
    }
    return { ...contractPath }
  }

  async _findNextContractPath(
    contractPath: Path,
    addressPath: string[],
    address: Uint8Array,
    slot: Uint8Array,
    lookupTrie: Trie,
  ) {
    const consumedNibbles = contractPath.stack
      .slice(1)
      .map((n) => (n instanceof BranchMPTNode ? 1 : n.keyLength()))
      .reduce((a, b) => a + b, 0)
    const nodePath = addressPath.slice(0, consumedNibbles + 1)
    this.logger.extend('findPath')(`consumed nibbles: ${consumedNibbles}`)
    this.logger.extend('findPath')(`Looking for next node in path [${nodePath}]`)
    const current = contractPath.stack[contractPath.stack.length - 1]
    if (current instanceof LeafMPTNode) {
      return { ...contractPath }
    }
    const nextNodeHash =
      current instanceof BranchMPTNode
        ? current.getBranch(Number.parseInt(addressPath[consumedNibbles], 16))
        : current.value()

    if (nextNodeHash === undefined || nextNodeHash === null) {
      return { ...contractPath }
    }
    this.logger.extend('findPath')(`Looking for node: [${bytesToHex(nextNodeHash as Uint8Array)}]`)
    const nextContentKey = encodeStorageTrieNodeContentKey({
      path: packNibbles(nodePath),
      nodeHash: nextNodeHash as Uint8Array,
      addressHash: new Trie({ useKeyHashing: true })['hash'](address),
    })
    const found = await this.lookupStorageTrieNode(nextContentKey)
    this.logger.extend('findPath')(
      `Found node: [${bytesToHex(found.nodeHash)}] (${found.node.length} bytes)`,
    )
    this.db.temp.set(bytesToUnprefixedHex(found.nodeHash), bytesToUnprefixedHex(found.node))
    const nextPath = await lookupTrie.findPath(lookupTrie['hash'](slot))
    return nextPath
  }
}
