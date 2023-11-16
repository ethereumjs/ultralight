import { toHexString } from '@chainsafe/ssz'
import { AccountCache, CacheType, StorageCache } from '@ethereumjs/statemanager'
import { OriginalStorageCache } from '@ethereumjs/statemanager/dist/cjs/cache/originalStorageCache.js'
import { bytesToBigInt, bytesToHex } from '@ethereumjs/util'

import type { StateNetwork } from './state.js'
import type { EVMStateManagerInterface, Proof, StorageDump, StorageRange } from '@ethereumjs/common'
import type { Account, Address } from '@ethereumjs/util'

export class UltralightStateManager implements EVMStateManagerInterface {
  originalStorageCache: {
    get(address: Address, key: Uint8Array): Promise<Uint8Array>
    clear(): void
  }

  protected _contractCache: Map<string, Uint8Array>
  protected _storageCache: StorageCache
  protected _accountCache: AccountCache
  state: StateNetwork
  stateRoot: string
  stateRootBytes: Uint8Array
  constructor(stateNetwork: StateNetwork) {
    this._contractCache = new Map()
    this._storageCache = new StorageCache({ size: 100000, type: CacheType.ORDERED_MAP })
    this._accountCache = new AccountCache({ size: 100000, type: CacheType.ORDERED_MAP })

    this.originalStorageCache = new OriginalStorageCache(this.getContractStorage.bind(this))
    this.state = stateNetwork
    this.stateRoot = ''
    this.stateRootBytes = new Uint8Array()
  }

  clearCaches(): void {
    this._contractCache.clear()
    this._storageCache.clear()
    this._accountCache.clear()
  }

  dumpStorage(address: Address): Promise<StorageDump> {
    const storageMap = this._storageCache.dump(address)
    const dump: StorageDump = {}
    if (storageMap !== undefined) {
      for (const slot of storageMap) {
        dump[slot[0]] = bytesToHex(slot[1])
      }
    }
    return Promise.resolve(dump)
  }

  dumpStorageRange(_address: Address, _startKey: bigint, _limit: number): Promise<StorageRange> {
    throw new Error('Method not implemented.')
  }
  generateCanonicalGenesis(_initState: any): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getProof(_address: Address, _storageSlots?: Uint8Array[] | undefined): Promise<Proof> {
    throw new Error('Method not implemented.')
  }
  shallowCopy(): EVMStateManagerInterface {
    return new UltralightStateManager(this.state)
  }
  getAccount = async (address: Address): Promise<Account | undefined> => {
    const account = await this.state.getAccount(address.toString(), this.stateRoot)
    if (account !== undefined) this._accountCache?.put(address, account)
    return account
  }
  putAccount = async (_address: Address, _account?: Account | undefined): Promise<void> => {
    return undefined
  }
  deleteAccount(_address: Address): Promise<void> {
    throw new Error('Method not implemented.')
  }
  modifyAccountFields(
    _address: Address,
    _accountFields: Partial<Pick<Account, 'nonce' | 'balance' | 'storageRoot' | 'codeHash'>>,
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
  putContractCode = async (address: Address, value: Uint8Array): Promise<void> => {
    // Store contract code in the cache
    this._contractCache.set(address.toString(), value)
  }
  getContractCode = async (address: Address): Promise<Uint8Array> => {
    let code = this._contractCache.get(address.toString())
    if (code !== undefined) return code

    const account = await this.state.getAccount(address.toString(), this.stateRoot)
    if (account !== undefined) {
      code = await this.state.getBytecode(toHexString(account.codeHash), address.toString())
      this._contractCache.set(address.toString(), code ?? new Uint8Array())
    }
    return code ?? new Uint8Array()
  }
  getContractStorage = async (address: Address, key: Uint8Array): Promise<Uint8Array> => {
    // Check storage slot in cache
    if (key.length !== 32) {
      throw new Error('Storage key must be 32 bytes long')
    }

    let value = this._storageCache!.get(address, key)
    if (value !== undefined) {
      return value
    }

    value = await this.state.getContractStorage(
      address.toString(),
      bytesToBigInt(key),
      this.stateRoot,
    )
    await this.putContractStorage(address, key, value ?? new Uint8Array())
    return value ?? new Uint8Array()
  }
  putContractStorage = async (
    address: Address,
    key: Uint8Array,
    value: Uint8Array,
  ): Promise<void> => {
    this._storageCache.put(address, key, value)
  }

  clearContractStorage = async (address: Address): Promise<void> => {
    this._storageCache.clearContractStorage(address)
  }
  checkpoint = async (): Promise<void> => {
    return undefined
  }
  commit = async (): Promise<void> => {}
  revert(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getStateRoot = async (): Promise<Uint8Array> => {
    return this.stateRootBytes
  }
  setStateRoot = async (
    stateRoot: Uint8Array,
    _clearCache?: boolean | undefined,
  ): Promise<void> => {
    this.stateRootBytes = stateRoot
    this.stateRoot = bytesToHex(stateRoot)
  }
  hasStateRoot = async (root: Uint8Array): Promise<boolean> => {
    return this.state.stateDB.getAccountTrie(bytesToHex(root)) !== undefined
  }
}
