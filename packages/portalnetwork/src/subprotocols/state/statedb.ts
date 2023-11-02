import { Debugger } from 'debug'
import { StateProtocol } from './state.js'
import { Trie } from '@ethereumjs/trie'
import {
  AccountTrieProofType,
  ContractStorageTrieProofType,
  StateNetworkContentType,
} from './types.js'
import { UintBigintType, fromHexString, toHexString } from '@chainsafe/ssz'
import { Account, MapDB, equalsBytes } from '@ethereumjs/util'
import { decodeStateNetworkContentKey } from './util.js'

type StateRoot = string
type StorageRoot = string
type CodeHash = string
type TrieRoot = string
type Address = string

export class StateDB {
  trieDB: MapDB<string, string>
  logger: Debugger
  state: StateProtocol
  stateRoots: Array<StateRoot>
  accounts: Set<Address>
  accountTries: Map<StateRoot, TrieRoot>
  storageTries: Map<StateRoot, Map<Address, StorageRoot>>
  accountCodeHash: Map<Address, CodeHash>
  contractByteCode: Map<CodeHash, Uint8Array>

  constructor(state: StateProtocol) {
    this.state = state
    this.trieDB = new MapDB()
    this.logger = state.logger.extend('StateDB')
    this.stateRoots = []
    this.accounts = new Set()
    this.accountTries = new Map()
    this.storageTries = new Map()
    this.accountCodeHash = new Map()
    this.contractByteCode = new Map()
  }

}
