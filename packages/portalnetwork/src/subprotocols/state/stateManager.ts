import { EVMStateManagerInterface, Proof, StorageDump, StorageRange } from '@ethereumjs/common'
import { Address, Account, bytesToBigInt, bytesToHex } from '@ethereumjs/util'

import { StateProtocol } from './state.js'

export class UltralightStateManager implements EVMStateManagerInterface {
  originalStorageCache: {
    get(address: Address, key: Uint8Array): Promise<Uint8Array>
    clear(): void
  }

  state: StateProtocol
  stateRoot: string
  stateRootBytes: Uint8Array
  constructor(stateNetwork: StateProtocol) {
    this.originalStorageCache = new Map()
    this.state = stateNetwork
    this.stateRoot = ''
    this.stateRootBytes = new Uint8Array()
  }
  dumpStorage(address: Address): Promise<StorageDump> {
    throw new Error('Method not implemented.')
  }
  dumpStorageRange(address: Address, startKey: bigint, limit: number): Promise<StorageRange> {
    throw new Error('Method not implemented.')
  }
  generateCanonicalGenesis(initState: any): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getProof(address: Address, storageSlots?: Uint8Array[] | undefined): Promise<Proof> {
    throw new Error('Method not implemented.')
  }
  shallowCopy(): EVMStateManagerInterface {
    return new UltralightStateManager(this.state)
  }
  getAccount(address: Address): Promise<Account | undefined> {
    return this.state.stateDB.getAccount(address.toString(), this.stateRoot)
  }
  putAccount(address: Address, account?: Account | undefined): Promise<void> {
    throw new Error('Method not implemented.')
  }
  deleteAccount(address: Address): Promise<void> {
    throw new Error('Method not implemented.')
  }
  modifyAccountFields(
    address: Address,
    accountFields: Partial<Pick<Account, 'nonce' | 'balance' | 'storageRoot' | 'codeHash'>>,
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
  putContractCode(address: Address, value: Uint8Array): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getContractCode = async (address: Address): Promise<Uint8Array> => {
    const code = await this.state.stateDB.getCode(address.toString(), this.stateRoot)
    return code ?? new Uint8Array()
  }
  getContractStorage = async (address: Address, key: Uint8Array): Promise<Uint8Array> => {
    const res = await this.state.stateDB.getStorageAt(
      address.toString(),
      bytesToBigInt(key),
      this.stateRoot,
    )
    return res ?? new Uint8Array()
  }
  putContractStorage(address: Address, key: Uint8Array, value: Uint8Array): Promise<void> {
    throw new Error('Method not implemented.')
  }
  clearContractStorage(address: Address): Promise<void> {
    throw new Error('Method not implemented.')
  }
  checkpoint(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  commit(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  revert(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getStateRoot = async (): Promise<Uint8Array> => {
    return this.stateRootBytes
  }
  setStateRoot = async (stateRoot: Uint8Array, clearCache?: boolean | undefined): Promise<void> => {
    this.stateRootBytes = stateRoot
    this.stateRoot = bytesToHex(stateRoot)
  }
  hasStateRoot = async (root: Uint8Array): Promise<boolean> => {
    return (await this.state.stateDB.getAccountTrie(bytesToHex(root))) !== undefined
  }
}
