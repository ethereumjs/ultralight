import { Debugger } from 'debug'
import { StateNetwork } from './state.js'
import { Trie } from '@ethereumjs/trie'
import {
  AccountTrieProofType,
  ContractStorageTrieProofType,
  StateNetworkContentType,
} from './types.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Account, MapDB, equalsBytes } from '@ethereumjs/util'
import { decodeStateNetworkContentKey } from './util.js'
import { RLP } from '@ethereumjs/rlp'

type StateRoot = string
type StorageRoot = string
type CodeHash = string
type TrieRoot = string
type Address = string

export class StateDB {
  trieDB: MapDB<string, string>
  logger: Debugger | undefined
  state?: StateNetwork
  stateRoots: Set<StateRoot>
  accounts: Set<Address>
  accountTries: Map<StateRoot, TrieRoot>
  storageTries: Map<StateRoot, Map<Address, StorageRoot>>
  accountCodeHash: Map<Address, CodeHash>
  contractByteCode: Map<CodeHash, Uint8Array>

  constructor(state?: StateNetwork) {
    this.state = state
    this.trieDB = new MapDB()
    this.logger = state?.logger.extend('StateDB')
    this.stateRoots = new Set()
    this.accounts = new Set()
    this.accountTries = new Map()
    this.storageTries = new Map()
    this.accountCodeHash = new Map()
    this.contractByteCode = new Map()
  }

  /**
   * Store content by content key
   * @param contentKey
   * @param content
   * @returns true if content is stored successfully
   */
  async storeContent(contentKey: Uint8Array, content: Uint8Array) {
    const decoded = decodeStateNetworkContentKey(contentKey)
    this.accounts.add(toHexString(decoded.address))
    'stateRoot' in decoded && this.stateRoots.add(toHexString(decoded.stateRoot))
    switch (decoded.contentType) {
      case StateNetworkContentType.AccountTrieProof: {
        const { address, stateRoot } = decoded
        await this.inputAccountTrieProof(address, stateRoot, content)
        break
      }
      case StateNetworkContentType.ContractStorageTrieProof: {
        const { address, slot, stateRoot } = decoded
        await this.inputContractStorageTrieProof(address, slot, stateRoot, content)
        break
      }
      case StateNetworkContentType.ContractByteCode: {
        const { address, codeHash } = decoded
        await this.inputContractByteCode(address, codeHash, content)
        break
      }
    }
    return true
  }

  /**
   * Get content by content key
   * @param contentKey
   * @returns stored content or undefined
   */
  async getContent(contentKey: Uint8Array): Promise<Uint8Array | undefined> {
    const decoded = decodeStateNetworkContentKey(contentKey)
    switch (decoded.contentType) {
      case StateNetworkContentType.AccountTrieProof: {
        const { address, stateRoot } = decoded
        const trie = this.getAccountTrie(toHexString(stateRoot))
        const account = await this.getAccount(toHexString(address), toHexString(stateRoot))
        const proof = await trie.createProof(address)
        if (!account) {
          return undefined
        }
        return AccountTrieProofType.serialize({
          balance: account.balance,
          codeHash: account.codeHash,
          nonce: account.nonce,
          storageRoot: account.storageRoot,
          witnesses: proof,
        })
      }
      case StateNetworkContentType.ContractStorageTrieProof: {
        const { address, slot, stateRoot } = decoded
        const trie = await this.getStorageTrie(toHexString(stateRoot), toHexString(address))
        let data = await trie.get(fromHexString('0x' + slot.toString(16).padStart(64, '0')))
        if (!data) {
          data = new Uint8Array(32).fill(0)
        } else {
          data = RLP.decode(data) as Uint8Array
        }
        const witnesses = await trie.createProof(
          fromHexString('0x' + slot.toString(16).padStart(64, '0')),
        )
        return ContractStorageTrieProofType.serialize({
          data,
          witnesses,
        })
      }
      case StateNetworkContentType.ContractByteCode: {
        const { codeHash } = decoded
        const code = this.contractByteCode.get(toHexString(codeHash))
        if (!code) {
          return undefined
        }
        return code
      }
    }
  }

  /**
   * Input data from AccountTrieProof to StateDB
   * @param address account address
   * @param stateRoot account trie root
   * @param content serialized content
   * @returns true if input success
   */
  async inputAccountTrieProof(
    address: Uint8Array,
    stateRoot: Uint8Array,
    content: Uint8Array,
  ): Promise<boolean> {
    const { balance, codeHash, nonce, storageRoot, witnesses } =
      AccountTrieProofType.deserialize(content)
    const accountTrie = this.getAccountTrie(toHexString(stateRoot))
    await accountTrie.fromProof(witnesses)
    const account = Account.fromAccountData({ balance, codeHash, nonce, storageRoot }).serialize()
    const stored = await accountTrie.get(address)
    if (!stored || !equalsBytes(account, stored)) {
      throw new Error('AccountTrieProof input failed')
    }
    this.logger?.('AccountTrieProof input success')
    return true
  }

  /**
   * Input data from ContractStorageTrieProof to StateDB
   * @param address contract address
   * @param slot storage slot
   * @param stateRoot storage trie root
   * @param content serialized content
   * @returns true if input succeeds
   */
  async inputContractStorageTrieProof(
    address: Uint8Array,
    slot: bigint,
    stateRoot: Uint8Array,
    content: Uint8Array,
  ): Promise<boolean> {
    const { data, witnesses } = ContractStorageTrieProofType.deserialize(content)
    const storageTrie = await this.getStorageTrie(toHexString(stateRoot), toHexString(address))
    await storageTrie.fromProof(witnesses)
    const slotHex = '0x' + slot.toString(16).padStart(64, '0')
    const slotBytes = fromHexString(slotHex)
    const stored = await storageTrie.get(slotBytes)
    if (
      !stored &&
      toHexString(data) !== '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      this.logger?.('ContractStorageTrieProof input failed')
      throw new Error(
        `ContractStorageTrieProof input failed: slot ${slotHex} not found in storage trie`,
      )
    }
    this.setStorageTrie(
      toHexString(stateRoot),
      toHexString(address),
      toHexString(storageTrie.root()),
    )
    this.logger?.('ContractStorageTrieProof input success')
    return true
  }

  /**
   * Input data from ContractByteCode to StateDB
   * @param address contract address
   * @param codeHash contract codeHash
   * @param content contract bytecode
   * @returns true if input succeeds
   */
  async inputContractByteCode(
    address: Uint8Array,
    codeHash: Uint8Array,
    content: Uint8Array,
  ): Promise<boolean> {
    this.contractByteCode.set(toHexString(codeHash), content)
    this.accountCodeHash.set(toHexString(address), toHexString(codeHash))
    this.logger?.('ContractByteCode input success')
    return true
  }

  /**
   * Get account trie by state root
   * @param stateRoot
   * @returns account trie
   */
  getAccountTrie(stateRoot: StateRoot): Trie {
    return new Trie({ useKeyHashing: true, root: fromHexString(stateRoot), db: this.trieDB })
  }

  /**
   * Get account data by address and state root
   * @param account address as hex prefixed string
   * @param stateRoot state root as hex prefixed string
   * @returns account data
   */
  async getAccount(address: string, stateRoot: StateRoot) {
    const trie = this.getAccountTrie(stateRoot)
    const key = fromHexString(address)
    const accountRLP = await trie.get(key)
    if (accountRLP === null) {
      return undefined
    }
    return Account.fromRlpSerializedAccount(accountRLP)
  }

  /**
   * Get account balance at a state root
   * @param address account address
   * @param stateRoot state root
   * @returns account balance
   */
  async getBalance(address: Address, stateRoot: StateRoot) {
    const account = await this.getAccount(address, stateRoot)
    if (!account) {
      return undefined
    }
    return account.balance
  }

  /**
   * Get account nonce (tx count) at a state root
   * @param address account address
   * @param stateRoot state root
   * @returns account nonce
   */
  async getTransactionCount(address: Address, stateRoot: StateRoot) {
    const account = await this.getAccount(address, stateRoot)
    if (!account) {
      return undefined
    }
    return account.nonce
  }

  /**
   * Get storage trie for a state root
   * @param stateRoot state root
   * @returns Map of addresses to storage roots at a state root
   */
  getStorageTries(stateRoot: StateRoot): Map<Address, TrieRoot> {
    if (!this.storageTries.has(stateRoot)) {
      this.storageTries.set(stateRoot, new Map())
    }
    return this.storageTries.get(stateRoot)!
  }

  /**
   * Get storage trie root from storage trie map
   * @param stateRoot state root
   * @param address contract address
   * @returns storage trie root for a contract at a state root
   */
  getContractStorageRoot(stateRoot: StateRoot, address: Address) {
    const storageTries = this.getStorageTries(stateRoot)
    if (!storageTries.has(address)) {
      return undefined
    }
    return fromHexString(storageTries.get(address)!)
  }

  /**
   * Get storage trie root from account trie
   * @param address contract address
   * @param stateRoot state root
   * @returns storage trie root for a contract at a state root
   */
  async getAccountStorageRoot(address: Address, stateRoot: StateRoot) {
    const trie = this.getAccountTrie(stateRoot)
    const key = fromHexString(address.toString())
    const accountRLP = await trie.get(key)
    if (accountRLP === null) {
      return undefined
    }
    const { storageRoot } = Account.fromRlpSerializedAccount(accountRLP)
    return storageRoot
  }

  /**
   * Get storage trie root for a contract at a state root
   * @param address contract address
   * @param stateRoot state root
   * @returns storage trie root for a contract at a state root
   */
  async getStorageRoot(address: Address, stateRoot: StateRoot) {
    let storageRoot: Uint8Array | undefined = this.getContractStorageRoot(stateRoot, address)
    if (!storageRoot) {
      storageRoot = await this.getAccountStorageRoot(address, stateRoot)
    }
    return storageRoot
  }

  /**
   * Get storage Trie for a contract at a state root
   * @param stateRoot state root
   * @param address contract address
   * @returns storage trie for a contract at a state root
   */
  async getStorageTrie(stateRoot: StateRoot, address: Address): Promise<Trie> {
    const storageRoot = await this.getStorageRoot(address, stateRoot)
    if (!storageRoot) {
      return new Trie({ useKeyHashing: true, db: this.trieDB })
    }
    return new Trie({ useKeyHashing: true, root: storageRoot, db: this.trieDB })
  }

  /**
   * Get storage value at a slot position in contract storage at a state root
   * @param address contract address
   * @param slot storage position
   * @param stateRoot state root
   * @returns value at slot position in contract storage
   */
  async getStorageAt(address: Address, slot: bigint, stateRoot: StateRoot) {
    const trie = await this.getStorageTrie(stateRoot, address)
    const key = fromHexString('0x' + slot.toString(16).padStart(64, '0'))
    const value = await trie.get(key, true)
    if (value === null) {
      return undefined
    }
    return value
  }

  /**
   * Set storage trie root for a contract at a state root
   * @param stateRoot state root
   * @param address contract address
   * @param storageRoot storage root
   * @returns true if storage trie root is set successfully
   */
  async setStorageTrie(stateRoot: StateRoot, address: Address, storageRoot: TrieRoot) {
    const storageTries = this.getStorageTries(stateRoot)
    storageTries.set(address, storageRoot)
    this.storageTries.set(stateRoot, storageTries)
    return true
  }

  /**
   * Get contract code hash at from contract address at a state root
   * @param address contract address
   * @param stateRoot state root
   * @returns contract code hash at address
   */
  async getAccountCodeHash(
    address: Address,
    stateRoot?: StateRoot,
  ): Promise<Uint8Array | undefined> {
    if (this.accountCodeHash.has(address)) {
      return fromHexString(this.accountCodeHash.get(address)!)
    }
    if (!stateRoot) {
      return undefined
    }
    const account = await this.getAccount(address, stateRoot)
    if (!account) {
      return undefined
    }
    return account.codeHash
  }

  /**
   * Get contract bytecode at a state root
   * @param address contract address
   * @param stateRoot state root
   * @returns contract bytecode
   */
  async getCode(address: Address, stateRoot?: StateRoot) {
    const codeHash = await this.getAccountCodeHash(address, stateRoot)
    if (!codeHash) {
      return undefined
    }
    return this.contractByteCode.get(toHexString(codeHash))
  }

  /**
   * Get contract bytecode by code hash
   * @param codeHash contract code hash
   * @returns contract bytecode
   */
  async getContractByteCode(codeHash: CodeHash) {
    return this.contractByteCode.get(codeHash)
  }
}
