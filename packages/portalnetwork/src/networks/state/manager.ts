import { Trie } from '@ethereumjs/trie'
import { Account } from '@ethereumjs/util'

import { ContentLookup } from '../contentLookup.js'

import { PortalTrieDB, StateNetworkContentKey } from './util.js'

import type { StateNetwork } from './state.js'
import type { Path } from '@ethereumjs/trie'

export class StateManager {
  state: StateNetwork
  db: PortalTrieDB
  constructor(state: StateNetwork) {
    this.state = state
    this.db = new PortalTrieDB(state.db.db)
  }

  async findPath(stateroot: Uint8Array, address: Uint8Array): Promise<Path | undefined> {
    const lookupTrie = new Trie({ db: this.db, root: stateroot, useKeyHashing: true })
    try {
      const path = await lookupTrie.findPath(address)
      return path
    } catch {
      return undefined
    }
  }
  async getAccount(address: Uint8Array, stateroot: Uint8Array): Promise<Uint8Array | undefined> {
    const accountPath = await this.findPath(stateroot, address)
    return accountPath?.node?.value() ?? undefined
  }
  async getBalance(address: Uint8Array, stateroot: Uint8Array): Promise<bigint | undefined> {
    const accountRLP = await this.getAccount(address, stateroot)
    if (accountRLP === undefined) {
      return undefined
    }
    const account = Account.fromRlpSerializedAccount(accountRLP)
    return account.balance
  }
  async getCodeHash(address: Uint8Array, stateroot: Uint8Array): Promise<Uint8Array | undefined> {
    const accountRLP = await this.getAccount(address, stateroot)
    if (accountRLP === undefined) {
      return undefined
    }
    const account = Account.fromRlpSerializedAccount(accountRLP)
    return account.codeHash
  }
  async getNonce(address: Uint8Array, stateroot: Uint8Array): Promise<bigint | undefined> {
    const accountRLP = await this.getAccount(address, stateroot)
    if (accountRLP === undefined) {
      return undefined
    }
    const account = Account.fromRlpSerializedAccount(accountRLP)
    return account.nonce
  }
  async getCode(address: Uint8Array, stateroot: Uint8Array): Promise<Uint8Array | undefined> {
    const codeHash = await this.getCodeHash(address, stateroot)
    if (codeHash === undefined) {
      return undefined
    }
    const addressHash = new Trie({ useKeyHashing: true })['hash'](address)
    const contentKey = StateNetworkContentKey.encode({ codeHash, addressHash })
    const codeLookup = new ContentLookup(this.state, contentKey)
    const response = await codeLookup.startLookup()
    if (response && 'content' in response) {
      return response.content
    }
  }
  async getStorageRoot(
    address: Uint8Array,
    stateroot: Uint8Array,
  ): Promise<Uint8Array | undefined> {
    const accountRLP = await this.getAccount(address, stateroot)
    if (accountRLP === undefined) {
      return undefined
    }
    const account = Account.fromRlpSerializedAccount(accountRLP)
    return account.storageRoot
  }
  async getStorageAt(
    address: Uint8Array,
    slot: Uint8Array,
    stateroot: Uint8Array,
  ): Promise<Uint8Array | undefined> {
    const storageRoot = await this.getStorageRoot(address, stateroot)
    if (storageRoot === undefined) {
      return undefined
    }
    const storageTrie = new Trie({
      db: this.db,
      root: storageRoot,
      useKeyHashing: true,
    })
    const slotHash = new Trie({ useKeyHashing: true })['hash'](slot)
    const slotValue = await storageTrie.get(slotHash)
    return slotValue ?? undefined
  }
}
