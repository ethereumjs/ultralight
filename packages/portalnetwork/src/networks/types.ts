import { ByteVectorType } from '@chainsafe/ssz'
import { zeros } from '@ethereumjs/util'
import { keccak256 } from 'ethereum-cryptography/keccak.js'

import type { BeaconLightClientNetwork } from './beacon'
import type { HistoryNetwork } from './history'
import type { StateNetwork } from './state'
import type { PortalNetwork } from '../client'
import type { ENR, NodeId } from '@chainsafe/enr'
import type { PrefixedHexString } from '@ethereumjs/util'
import type { AbstractLevel } from 'abstract-level'

export interface BaseNetworkConfig {
  client: PortalNetwork
  networkId: NetworkId
  db?: { db: AbstractLevel<string, string>; path: string }
  radius?: bigint
  maxStorage?: number
  bridge?: boolean
}

const BYTE_SIZE = 256

// subnetwork IDs
export enum NetworkId {
  StateNetwork = '0x500a',
  HistoryNetwork = '0x500b',
  BeaconChainNetwork = '0x500c',
  CanonicalTxIndexNetwork = '0x500d',
  VerkleStateNetwork = '0x500e',
  TransactionGossipNetwork = '0x500f',
  Angelfood_StateNetwork = '0x504a',
  Angelfood_HistoryNetwork = '0x504b',
  Angelfood_BeaconChainNetwork = '0x504c',
  Angelfood_CanonicalTxIndexNetwork = '0x504d',
  Angelfood_VerkleStateNetwork = '0x504e',
  Angelfood_TransactionGossipNetwork = '0x504f',
  UTPNetwork = '0x757470',
  Rendezvous = '0x72656e',
}

export type SubNetwork<T extends NetworkId> = T extends '0x500a'
  ? HistoryNetwork
  : T extends '0x504a'
    ? HistoryNetwork
    : T extends '0x500b'
      ? StateNetwork
      : T extends '0x504b'
        ? StateNetwork
        : T extends '0x500c'
          ? BeaconLightClientNetwork
          : T extends '0x504c'
            ? BeaconLightClientNetwork
            : never

export class Bloom {
  bitvector: Uint8Array

  /**
   * Represents a Bloom filter.
   */
  constructor(bitvector?: Uint8Array) {
    if (!bitvector) {
      this.bitvector = zeros(BYTE_SIZE)
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
