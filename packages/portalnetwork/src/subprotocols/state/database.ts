import { fromHexString, toHexString } from '@chainsafe/ssz'
import { DefaultStateManager } from '@ethereumjs/statemanager'
import { DB, BatchDBOp, Trie } from '@ethereumjs/trie'
import { Account, Address } from '@ethereumjs/util'
import { AbstractLevel, NodeCallback } from 'abstract-level'
import { MemoryLevel } from 'memory-level'
import { StateRootIndex } from './stateroots.js'
import { AccountTrieProof, AccountTrieProofKey, StateRoot, StateRootHex } from './types.js'

export type TrieDB = MemoryLevel | AbstractLevel<string, string>
export type TrieLevelStatus = 'opening' | 'open' | 'closing' | 'closed'
export type Addr = string
export type AddressRoots = Map<Addr, StateRootHex[]>
export type AccountRecord = { address: Addr; accounts: Record<StateRootHex, Account> }
export type AddressRecord = [Addr, AccountRecord]
