import { ByteVectorType } from '@chainsafe/ssz'
import { zeros } from '@ethereumjs/util'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { HistoryNetwork } from './history'
import { StateNetwork } from './state'
import { BeaconLightClientNetwork } from './beacon'

const BYTE_SIZE = 256

// subnetwork IDs
export enum NetworkId {
  StateNetwork = '0x500a',
  HistoryNetwork = '0x500b',
  TxGossipNetwork = '0x500c',
  HeaderGossipNetwork = '0x500d',
  CanonicalIndicesNetwork = '0x500e',
  BeaconLightClientNetwork = '0x501a',
  UTPNetwork = '0x757470',
  Rendezvous = '0x72656e',
}

export type SubNetwork<T extends NetworkId> = T extends '0x500a'
  ? HistoryNetwork
  : T extends '0x500b'
  ? StateNetwork
  : T extends '0x501a'
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
      const bitLoc = 1 << loc % 8
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
      const bitLoc = 1 << loc % 8
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
    if (bloom) {
      for (let i = 0; i <= BYTE_SIZE; i++) {
        this.bitvector[i] = this.bitvector[i] | bloom.bitvector[i]
      }
    }
  }
}

/** Common SSZ Type Aliases */
export const Bytes32Type = new ByteVectorType(32, { typeName: 'Bytes32' })
