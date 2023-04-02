import { fromHexString, toHexString } from '@chainsafe/ssz'
import { DefaultStateManager } from '@ethereumjs/statemanager'
import { DB, BatchDBOp, Trie } from '@ethereumjs/trie'
import { Account, Address } from '@ethereumjs/util'
import { AbstractLevel, NodeCallback } from 'abstract-level'
import { MemoryLevel } from 'memory-level'
import { StateRootIndex } from './stateroots.js'
import {
  AccountTrieProofKey,
  ContractStorageTrieProof,
  StateAccountProofs,
  StateRoot,
  StateRootHex,
  StorageTrieProofKey,
} from './types.js'

export type TrieDB = MemoryLevel | AbstractLevel<string, string>
export type TrieLevelStatus = 'opening' | 'open' | 'closing' | 'closed'
export type Addr = string
export type AddressRoots = Map<Addr, StateRootHex[]>
export type AccountRecord = { address: Addr; accounts: Record<StateRootHex, Account> }
export type ContractRecord = { address: string; storageTrie: TrieLevel }
export type ContractsStore = Map<Addr, TrieLevel>
export type StorageRecord = Map<StateRootHex, ContractsStore>
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

export class StateDB {
  accountTries: Map<StateRootHex, TrieLevel>
  storageTries: StorageRecord
  knownAddresses: Set<string>
  stateRootIndex: StateRootIndex
  constructor() {
    this.accountTries = new Map()
    this.storageTries = new Map()
    this.knownAddresses = new Set()
    this.stateRootIndex = StateRootIndex.from([])
  }

  async addRoot(stateRoot: StateRoot): Promise<TrieLevel> {
    const sub = new TrieLevel()
    this.putAccountTrie(stateRoot, sub)
    await sub.open()
    while (sub.status !== 'open') {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return sub
  }
  putAccountTrie(stateRoot: StateRoot, accountTrie: TrieLevel): TrieLevel {
    this.accountTries.set(toHexString(stateRoot), accountTrie)
    return accountTrie
  }
  async getAccountTrieDB(stateRoot: StateRoot): Promise<TrieLevel> {
    return this.accountTries.get(toHexString(stateRoot)) ?? this.addRoot(stateRoot)
  }
  delAccountTrie(stateRoot: StateRoot): void {
    this.accountTries.delete(toHexString(stateRoot))
  }
  putStorageTrie(stateRoot: StateRoot, address: string, storageTrie: TrieLevel): TrieLevel {
    const state = this.storageTries.get(toHexString(stateRoot)) ?? new Map()
    state.set(address, storageTrie)
    this.storageTries.set(toHexString(stateRoot), state)
    return storageTrie
  }
  putStateContracts(stateRoot: StateRoot, storageTries: ContractsStore): ContractsStore {
    this.storageTries.set(toHexString(stateRoot), storageTries)
    return storageTries
  }
  putStorageTries(stateRoot: StateRoot, storageTries: ContractRecord[]): void {
    const state: ContractsStore = new Map()
    for (const { address, storageTrie } of storageTries) {
      state.set(address, storageTrie)
    }
    this.storageTries.set(toHexString(stateRoot), state)
  }
  async storageTrieDB(stateRoot: StateRoot, address: Addr): Promise<TrieLevel> {
    const state = this.storageTries.get(toHexString(stateRoot)) ?? new Map()
    return state.get(address) ?? new Map()
  }
  async getStorageTrie(stateRoot: StateRoot, address: Addr): Promise<Trie> {
    const db = await this.storageTrieDB(stateRoot, address)
    const trie = await Trie.create({ db: new TrieLevel(db.db), root: Buffer.from(stateRoot) })
    return trie
  }
  delStorageTries(stateRoot: StateRoot): void {
    this.accountTries.delete(toHexString(stateRoot))
  }

  async getAccountTrie(stateRoot: StateRoot) {
    const db = await this.getAccountTrieDB(stateRoot)
    const trie = await Trie.create({ db: new TrieLevel(db.db), root: Buffer.from(stateRoot) })
    return trie
  }
  async getStorageTries(stateRoot: StateRootHex): Promise<Trie[]> {
    const state = this.storageTries.get(stateRoot)
    if (!state) {
      return []
    }
    const storageTrieDBs: TrieLevel[] = [...state.values()].map((storageTrie) => {
      return storageTrie
    })
    const tries = await Promise.all(
      storageTrieDBs.map(async (db) => {
        const trie = await Trie.create({ db: new TrieLevel(db.db), root: Buffer.from(stateRoot) })
        return trie
      })
    )
    return tries
  }

  async getAllAccountTries() {
    const tries: Trie[] = []
    for (const root of this.accountTries.keys()) {
      const db = await this.getAccountTrieDB(fromHexString(root))
      const trie = await Trie.create({ db, root: Buffer.from(fromHexString(root)) })
      tries.push(trie)
    }
    return tries
  }

  private async _getAddrRoots(addr: string): Promise<StateRoot[]> {
    const tries = await this.getAllAccountTries()
    const accountPresent = []
    for (const trie of tries) {
      const state = new DefaultStateManager({ trie: trie })
      if (await state.accountExists(Address.fromString(addr))) {
        accountPresent.push(trie.root())
      }
    }
    return accountPresent
  }

  async rootsByAddr(): Promise<AddressRoots> {
    const accountRecords = await Promise.all(
      [...this.knownAddresses].map(async (addr) => {
        return [addr, await this._getAddrRoots(addr)]
      })
    )

    return Object.fromEntries(accountRecords)
  }

  async getAccount(stateRoot: StateRoot, address: Address): Promise<Account> {
    const trie = await this.getAccountTrie(stateRoot)
    const state = new DefaultStateManager({ trie })
    return state.getAccount(address)
  }

  async getAccountRecord(address: string): Promise<AccountRecord> {
    const roots: StateRoot[] = await Promise.all(await this._getAddrRoots(address))
    const accounts: [StateRootHex, Account][] = await Promise.all(
      roots.map(async (root) => {
        return [toHexString(root), await this.getAccount(root, Address.fromString(address))]
      })
    )
    return { address, accounts: Object.fromEntries(accounts) }
  }

  sortAccountRecord(accountRecord: AccountRecord): AccountRecord {
    const roots = Object.keys(accountRecord.accounts)
    const sortedRoots = roots.sort((root1, root2) => {
      if (accountRecord.accounts[root1].nonce === accountRecord.accounts[root2].nonce) {
        return Number(accountRecord.accounts[root1].balance - accountRecord.accounts[root2].balance)
      } else {
        return Number(accountRecord.accounts[root1].nonce - accountRecord.accounts[root2].nonce)
      }
    })
    return {
      address: accountRecord.address,
      accounts: Object.fromEntries(
        sortedRoots.map((root) => {
          return [root, accountRecord.accounts[root]]
        })
      ),
    }
  }
  async getAllAccountRecords(): Promise<AccountRecord[]> {
    const rootsByAddr = await this.rootsByAddr()
    const addrs = Object.keys(rootsByAddr)
    const accountRecords: AccountRecord[] = await Promise.all(
      addrs.map(async (addr) => {
        return await this.getAccountRecord(addr)
      })
    )
    return accountRecords
  }

  private _setStateRootIndex(index: StateRootIndex) {
    this.stateRootIndex = index
  }

  async setStateRootIndex() {
    const sortedChangesByAccount = Object.fromEntries(
      Object.entries(await this.getAllAccountRecords()).map(([addr, accountRecord]) => {
        return [addr, this.sortAccountRecord(accountRecord)]
      })
    )
    const sortedRootsByAccount = Object.fromEntries(
      Object.entries(sortedChangesByAccount).map(([addr, account]) => {
        return [addr, Object.keys(account.accounts)]
      })
    )
    this._setStateRootIndex(StateRootIndex.from(Object.values(sortedRootsByAccount)))
  }

  async getStateRootOrder() {
    return this.stateRootIndex.allPaths()
  }

  async getStateRootOrderContaining(roots: Uint8Array[]) {
    return this.stateRootIndex.pathThru(roots.map((r) => toHexString(r)))
  }

  async getStateRootOrderForAccount(addr: string) {
    return this.stateRootIndex.pathThru(Object.keys(await this._getAddrRoots(addr)))
  }
  async updateAccount(contentKey: AccountTrieProofKey, content: StateAccountProofs) {
    const { stateRoot, address } = contentKey

    this.knownAddresses.add(toHexString(address))
    const trie = await this.getAccountTrie(stateRoot)
    if (
      !trie.verifyProof(
        Buffer.from(stateRoot),
        Buffer.from(address),
        content.witnesses.map((w) => Buffer.from(w))
      )
    ) {
      throw new Error('Invalid account trie proof')
    }
    await trie.fromProof(content.witnesses.map((w) => Buffer.from(w)))
    this.delAccountTrie(stateRoot)
    this.putAccountTrie(stateRoot, trie.database().db as TrieLevel)
    const roots = Object.keys(
      this.sortAccountRecord(await this.getAccountRecord(toHexString(address))).accounts
    )
    this.stateRootIndex.update([roots])
    return trie
  }

  async updateContractStorage(contentKey: StorageTrieProofKey, content: ContractStorageTrieProof) {
    const { stateRoot, address, slot } = contentKey
    const trie = await this.getStorageTrie(stateRoot, toHexString(address))
    if (
      !trie.verifyProof(
        Buffer.from(stateRoot),
        Buffer.from(address),
        content.witnesses.map((w) => Buffer.from(w))
      )
    ) {
      throw new Error('Invalid account trie proof')
    }
    await trie.fromProof(content.witnesses.map((w) => Buffer.from(w)))
    this.delAccountTrie(stateRoot)
    this.putAccountTrie(stateRoot, trie.database().db as TrieLevel)
    return trie
  }

  async size(): Promise<number> {
    let size = 0
    for (const sub of this.accountTries.keys()) {
      size += fromHexString(sub).length
    }
    for (const sub of this.accountTries.values()) {
      size += await sub.size()
    }
    return size
  }
}
