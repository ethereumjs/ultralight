import { ByteVectorType } from '@chainsafe/ssz'
import { keccak256 } from 'ethereum-cryptography/keccak.js'

import type { ENR, NodeId } from '@chainsafe/enr'
import type { PrefixedHexString } from '@ethereumjs/util'
import type { AbstractLevel } from 'abstract-level'
import { ChainId, type PortalNetwork } from '../client'
import type { BeaconNetwork } from './beacon'
import type { HistoryNetwork } from './history'
import type { StateNetwork } from './state'

export interface BaseNetworkConfig {
  client: PortalNetwork
  networkId: NetworkId
  db?: { db: AbstractLevel<string, string>; path: string }
  radius?: bigint
  maxStorage?: number
  bridge?: boolean
  gossipCount?: number
  dbSize?: () => Promise<number>
}

const BYTE_SIZE = 256

// subnetwork IDs
export enum NetworkId {
  // Mainnet
  StateNetwork = '0x500a',
  HistoryNetwork = '0x500b',
  BeaconChainNetwork = '0x500c',
  CanonicalTxIndexNetwork = '0x500d',
  VerkleStateNetwork = '0x500e',

  // Angelfood
  AngelfoodStateNetwork = '0x504a',
  AngelfoodHistoryNetwork = '0x504b',
  AngelfoodBeaconChainNetwork = '0x504c',
  AngelfoodCanonicalTxIndexNetwork = '0x504d',
  AngelfoodVerkleStateNetwork = '0x504e',

  // Sepolia
  SepoliaStateNetwork = '0x505a',
  SepoliaHistoryNetwork = '0x505b',
  SepoliaBeaconChainNetwork = '0x505c',
  SepoliaCanonicalTxIndexNetwork = '0x505d',
  SepoliaVerkleStateNetwork = '0x505e',

  // UTP
  UTPNetwork = '0x757470',
  
}

enum MainnetId {
  StateNetwork = '0x500a',
  HistoryNetwork = '0x500b',
  BeaconChainNetwork = '0x500c',
  CanonicalTxIndexNetwork = '0x500d',
  VerkleStateNetwork = '0x500e',
}

enum SepoliaId {
  StateNetwork = '0x505a',
  HistoryNetwork = '0x505b',
  BeaconChainNetwork = '0x505c',
  CanonicalTxIndexNetwork = '0x505d',
  VerkleStateNetwork = '0x505e',
}

enum AngelFoodId {
  StateNetwork = '0x504a',
  HistoryNetwork = '0x504b',
  BeaconChainNetwork = '0x504c',
  CanonicalTxIndexNetwork = '0x504d',
  VerkleStateNetwork = '0x504e',
}

export const NetworkIdByChain = {
  [ChainId.Mainnet]: MainnetId,
  [ChainId.Sepolia]: SepoliaId,
  [ChainId.AngelFood]: AngelFoodId,
}

export type SubNetwork<T extends NetworkId> = T extends `0x${string}a`
  ? StateNetwork
  : T extends `0x${string}b`
    ? HistoryNetwork
    : T extends `0x${string}c`
      ? BeaconNetwork
      : never

export class Bloom {
  bitvector: Uint8Array

  /**
   * Represents a Bloom filter.
   */
  constructor(bitvector?: Uint8Array) {
    if (!bitvector) {
      this.bitvector = new Uint8Array(BYTE_SIZE)
    } else {
      if (bitvector.length !== BYTE_SIZE) {
        throw new Error('bitvectors must be 2048 bits long')
      }
      this.bitvector = bitvector
    }
  }

  /**
   * Adds an element to a bit vector of a 64 byte bloom filter.
   * @param e - The element to add
   */
  add(e: Uint8Array) {
    if (!(e instanceof Uint8Array)) {
      throw new Error('Element should be Uint8Array')
    }
    e = keccak256(e)
    const mask = 2047 // binary 11111111111

    for (let i = 0; i < 3; i++) {
      const first2bytes = new DataView(e.buffer).getUint16(i * 2, false)
      const loc = mask & first2bytes
      const byteLoc = loc >> 3
      const bitLoc = 1 << (loc % 8)
      this.bitvector[BYTE_SIZE - byteLoc - 1] |= bitLoc
    }
  }

  /**
   * Checks if an element is in the bloom.
   * @param e - The element to check
   */
  check(e: Uint8Array): boolean {
    if (!(e instanceof Uint8Array)) {
      throw new Error('Element should be Uint8Array')
    }
    e = keccak256(e)
    const mask = 2047 // binary 11111111111
    let match = true

    for (let i = 0; i < 3 && match; i++) {
      const first2bytes = new DataView(e.buffer).getUint16(i * 2, false)
      const loc = mask & first2bytes
      const byteLoc = loc >> 3
      const bitLoc = 1 << (loc % 8)
      match = (this.bitvector[BYTE_SIZE - byteLoc - 1] & bitLoc) !== 0
    }

    return Boolean(match)
  }

  /**
   * Checks if multiple topics are in a bloom.
   * @returns `true` if every topic is in the bloom
   */
  multiCheck(topics: Uint8Array[]): boolean {
    return topics.every((t: Uint8Array) => this.check(t))
  }

  /**
   * Bitwise or blooms together.
   */
  or(bloom: Bloom) {
    if (bloom !== undefined) {
      for (let i = 0; i <= BYTE_SIZE; i++) {
        this.bitvector[i] = this.bitvector[i] | bloom.bitvector[i]
      }
    }
  }
}

/** Common SSZ Type Aliases */
export const Bytes32Type = new ByteVectorType(32, { typeName: 'Bytes32' })

/** Lookup types */
export type LookupPeer = {
  enr: ENR
  distance: number
}

export type ContentLookupResponse =
  | {
      content: Uint8Array
      utp: boolean
      trace?: ContentTrace
    }
  | { enrs: Uint8Array[]; trace?: ContentTrace }
  | undefined

export interface ContentTrace extends Partial<TraceObject> {}
export interface TraceObject {
  origin: NodeId
  targetId: string
  receivedFrom: NodeId
  responses: {
    [nodeId: NodeId]: NodeId[]
  }
  metadata: {
    [nodeId: NodeId]: {
      enr: `enr:${string}`
      distance: PrefixedHexString
    }
  }
  startedAtMs: {
    secs_since_epoch: number
    nanos_since_epoch: number
  }

  cancelled?: NodeId[]
}
