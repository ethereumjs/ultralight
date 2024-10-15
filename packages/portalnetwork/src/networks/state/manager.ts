import { RLP } from '@ethereumjs/rlp'
import { Trie } from '@ethereumjs/trie'
import { Account, bytesToHex } from '@ethereumjs/util'

import { ContentLookup } from '../contentLookup.js'

import { PortalTrie } from './portalTrie.js'
import { PortalTrieDB } from './portalTrieDB.js'
import { ContractRetrieval } from './types.js'
import { ContractCodeContentKey } from './util.js'

import type { StateNetwork } from './state.js'

export class StateManager {
  state: StateNetwork
  db: PortalTrieDB
  trie: PortalTrie
  constructor(state: StateNetwork) {
    this.state = state
    this.db = new PortalTrieDB(state.db.db, this.state.logger)
    this.trie = new PortalTrie(this)
  }

  async getAccount(address: Uint8Array, stateroot: Uint8Array): Promise<Uint8Array | undefined> {
    this.state.logger.extend('getAccount')(
      `Looking for Account ${bytesToHex(address)} at stateroot: ${bytesToHex(stateroot)}`,
    )
    const accountPath = await this.trie.findAccountPath(stateroot, address)
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
    const contentKey = ContractCodeContentKey.encode({ codeHash, addressHash })
    const codeLookup = new ContentLookup(this.state, contentKey)
    const response = await codeLookup.startLookup()
    if (response && 'content' in response) {
      const { code } = ContractRetrieval.deserialize(response.content)
      return code
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
  ): Promise<Uint8Array | null | undefined> {
    const storageRoot = await this.getStorageRoot(address, stateroot)
    if (storageRoot === undefined) {
      return undefined
    }
    const contractPath = await this.trie.findContractPath(storageRoot, slot, address)
    const slotValue = contractPath.node?.value()
    return slotValue instanceof Uint8Array ? (RLP.decode(slotValue) as Uint8Array) : slotValue
  }
}
