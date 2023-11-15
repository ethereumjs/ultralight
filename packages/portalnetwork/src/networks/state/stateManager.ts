import { toHexString } from '@chainsafe/ssz'
import { bytesToBigInt, bytesToHex } from '@ethereumjs/util'

import type { StateNetwork } from './state.js'
import type { EVMStateManagerInterface, Proof, StorageDump, StorageRange } from '@ethereumjs/common'
import type { Account, Address } from '@ethereumjs/util'

export class UltralightStateManager implements EVMStateManagerInterface {
  originalStorageCache: {
    get(address: Address, key: Uint8Array): Promise<Uint8Array>
    clear(): void
  }

  state: StateNetwork
  stateRoot: string
  stateRootBytes: Uint8Array
  constructor(stateNetwork: StateNetwork) {
    this.originalStorageCache = new Map()
    this.state = stateNetwork
    this.stateRoot = ''
    this.stateRootBytes = new Uint8Array()
  }
  dumpStorage(_address: Address): Promise<StorageDump> {
    throw new Error('Method not implemented.')
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
  getAccount(address: Address): Promise<Account | undefined> {
    return this.state.getAccount(address.toString(), this.stateRoot)
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
  putContractCode(_address: Address, _value: Uint8Array): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getContractCode = async (address: Address): Promise<Uint8Array> => {
    const account = await this.state.getAccount(address.toString(), this.stateRoot)
    const code =
      account && (await this.state.getBytecode(toHexString(account.codeHash), address.toString()))
    return code ?? new Uint8Array()
  }
  getContractStorage = async (address: Address, key: Uint8Array): Promise<Uint8Array> => {
    const res = await this.state.getContractStorage(
      address.toString(),
      bytesToBigInt(key),
      this.stateRoot,
    )
    return res ?? new Uint8Array()
  }
  putContractStorage(_address: Address, _key: Uint8Array, _value: Uint8Array): Promise<void> {
    throw new Error('Method not implemented.')
  }
  clearContractStorage(_address: Address): Promise<void> {
    throw new Error('Method not implemented.')
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
