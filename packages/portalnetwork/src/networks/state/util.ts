import { digest as sha256 } from '@chainsafe/as-sha256'
import { bigIntToBytes, concatBytes } from '@ethereumjs/util'

import { toHexString } from '../../util/discv5.js'

import {
  AccountTrieProofKeyType,
  ContractByteCodeKeyType,
  ContractStorageTrieKeyType,
  StateNetworkContentType,
} from './types.js'

import type { Address } from '@ethereumjs/util'

export const MODULO = 2n ** 256n
const MID = 2n ** 255n

/**
 * Calculates the distance between two ids using the distance function defined here
 * https://github.com/ethereum/portal-network-specs/blob/master/state-network.md#distance-function
 */
export const distance = (id1: bigint, id2: bigint): bigint => {
  if (id1 >= MODULO || id2 >= MODULO) {
    throw new Error('numeric representation of node id cannot be greater than 2^256')
  }
  let diff: bigint
  id1 > id2 ? (diff = id1 - id2) : (diff = id2 - id1)
  diff > MID ? (diff = MODULO - diff) : diff
  return diff
}

interface ContentKeyOpts {
  contentType: StateNetworkContentType
  address: Address
  stateRoot: Uint8Array
  slot: bigint
  codeHash: Uint8Array
}

export const getStateNetworkContentKey = (opts: Partial<ContentKeyOpts>) => {
  if (opts.address === undefined) {
    throw new Error('address is required')
  }
  switch (opts.contentType) {
    case StateNetworkContentType.AccountTrieNode: {
      if (opts.stateRoot === undefined) {
        throw new Error('stateRoot is required')
      }
      const key = AccountTrieProofKeyType.serialize({
        address: opts.address.toBytes(),
        stateRoot: opts.stateRoot,
      })
      return Uint8Array.from([opts.contentType, ...key])
    }
    case StateNetworkContentType.ContractTrieNode: {
      if (opts.slot === undefined) {
        throw new Error(`slot is required`)
      }
      if (opts.stateRoot === undefined) {
        throw new Error('stateRoot is required')
      }
      const key = ContractStorageTrieKeyType.serialize({
        address: opts.address.toBytes(),
        slot: opts.slot,
        stateRoot: opts.stateRoot,
      })
      return Uint8Array.from([opts.contentType, ...key])
    }
    case StateNetworkContentType.ContractByteCode: {
      if (opts.codeHash === undefined) {
        throw new Error('codeHash required')
      }
      const key = ContractByteCodeKeyType.serialize({
        address: opts.address.toBytes(),
        codeHash: opts.codeHash,
      })
      return Uint8Array.from([opts.contentType, ...key])
    }
    default:
      throw new Error(`Content Type ${opts.contentType} not supported`)
  }
}

export const keyType = (contentKey: Uint8Array): StateNetworkContentType => {
  switch (contentKey[0]) {
    case 16:
      return StateNetworkContentType.AccountTrieNode
    case 17:
      return StateNetworkContentType.ContractTrieNode
    case 18:
      return StateNetworkContentType.ContractByteCode
    default:
      throw new Error(`Invalid content key type: ${contentKey[0]}`)
  }
}

export const decodeStateNetworkContentKey = (
  key: Uint8Array,
):
  | {
      contentType: StateNetworkContentType.AccountTrieNode
      address: Uint8Array
      stateRoot: Uint8Array
    }
  | {
      contentType: StateNetworkContentType.ContractTrieNode
      address: Uint8Array
      slot: bigint
      stateRoot: Uint8Array
    }
  | {
      contentType: StateNetworkContentType.ContractByteCode
      address: Uint8Array
      codeHash: Uint8Array
    } => {
  const contentType = StateNetworkContentType[keyType(key)]
  switch (contentType) {
    case 'AccountTrieProof': {
      const { address, stateRoot } = AccountTrieProofKeyType.deserialize(key.slice(1))
      return { contentType: StateNetworkContentType.AccountTrieNode, address, stateRoot }
    }
    case 'ContractStorageTrieProof': {
      const { address, slot, stateRoot } = ContractStorageTrieKeyType.deserialize(key.slice(1))
      return {
        contentType: StateNetworkContentType.ContractTrieNode,
        address,
        slot,
        stateRoot,
      }
    }
    case 'ContractByteCode': {
      const { address, codeHash } = ContractByteCodeKeyType.deserialize(key.slice(1))
      return { contentType: StateNetworkContentType.ContractByteCode, address, codeHash }
    }
    default:
      throw new Error(`Content Type ${contentType} not supported`)
  }
}

export const getStateNetworkContentId = (opts: Partial<ContentKeyOpts>) => {
  if (!opts.address) {
    throw new Error('address is required')
  }
  switch (opts.contentType) {
    case StateNetworkContentType.AccountTrieNode: {
      return sha256(opts.address.toBytes())
    }
    case StateNetworkContentType.ContractTrieNode: {
      if (opts.slot === undefined) {
        throw new Error(`slot value required: ${opts}`)
      }
      return Uint8Array.from(
        bigIntToBytes(
          BigInt(toHexString(sha256(opts.address.toBytes()))) +
            (BigInt(toHexString(sha256(bigIntToBytes(opts.slot)))) % MODULO),
        ),
      )
    }
    case StateNetworkContentType.ContractByteCode: {
      if (!opts.codeHash) {
        throw new Error('codeHash required')
      }
      return sha256(concatBytes(opts.address.toBytes(), opts.codeHash))
    }
    default:
      throw new Error(`Content Type ${opts.contentType} not supported`)
  }
}

export function mergeArrays(arrays: string[][]): (string | string[])[] {
  const merged = arrays[0].map((v, i) => {
    const ambiguous = Array.from({ length: arrays.length }, (_, idx) => arrays[idx][i])
      .map((v) => JSON.stringify(v))
      .filter((v, i, _array) => _array.indexOf(v) === i)
      .map((v) => JSON.parse(v))
    return v === arrays[1][i] ? v : ambiguous
  })
  return merged
}

export function isSubarrayOf(a: string[], b: string[]): boolean {
  if (a.length > b.length) {
    return false
  }
  for (let i = 0; i <= b.length - a.length; i++) {
    let found = true
    for (let j = 0; j < a.length; j++) {
      if (a[j] !== b[i + j]) {
        found = false
        break
      }
    }
    if (found) {
      return true
    }
  }
  return false
}
export function removeDuplicateSequences(_arr: string[][]): string[][] {
  const arr = _arr
    .map((a) => JSON.stringify(a))
    .filter((a, i, _array) => _array.indexOf(a) === i)
    .map((a) => JSON.parse(a))
  const subarrays = new Set<string[]>()
  const result: string[][] = []

  for (let i = 0; i < arr.length; i++) {
    let isSubarray = false
    for (let j = 0; j < arr.length; j++) {
      if (i === j) {
        continue
      }
      if (isSubarrayOf(arr[i], arr[j])) {
        subarrays.add(arr[i])
        isSubarray = true
        break
      }
    }
    if (!isSubarray && !subarrays.has(arr[i])) {
      result.push(arr[i])
    }
  }

  return result
}

export function calculateAddressRange(
  address: bigint,
  radius: bigint,
): { min: bigint; max: bigint } {
  // Ensure we're dealing with BigInts representing 32-byte values
  address = BigInt.asUintN(256, address)
  radius = BigInt.asUintN(256, radius)
  // Find the maximum address by OR-ing the address with the radius.
  // This will set all bits to 1 where the radius has 1s, potentially up to the boundary of the radius.
  const maxAddress = BigInt.asUintN(256, address | radius)
  // Find the minimum address by AND-ing the address with the NOT of the radius.
  // This will clear all bits to 0 wherever the radius has 1s, potentially down to the boundary of the radius.
  const minAddress = BigInt.asUintN(256, address & ~radius)

  return { min: minAddress, max: maxAddress }
}

const NIBBLES_VALUES = [
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
] as const

const MAX_PATH_BYTES = 8

/**
 * Take a bytestring of loosely packed nibbles and return them tightly packed
 * @param path Bytestring of loosely packed nibbles
 */
export const tightlyPackNibbles = (path: Uint8Array): Uint8Array => {
  if (path.length % 2 !== 0) {
    throw new Error('path must be even length')
  }
  if (!path.every((v) => v in NIBBLES_VALUES)) {
    throw new Error('path must be a bytestring of nibbles')
  }
  const pathValues = path.values()
  const packedValues: number[] = []
  for (let i = 0; i < path.length / 2; i++) {
    const [high, low] = [pathValues.next().value, pathValues.next().value]
    const packed = (high << 4) | low
    packedValues.push(packed)
  }
  return Uint8Array.from(packedValues)
}

export const constructTrieNodeContentId = (path: Uint8Array, nodeHash: Uint8Array) => {
  if (nodeHash.length !== 32) {
    throw new Error('nodeHash must be 32 bytes')
  }
  if (path.length > 64) {
    throw new Error('path must be less than 64 nibbles')
  }
  if (!path.every((v) => v in NIBBLES_VALUES)) {
    throw new Error('path must be a bytestring of nibbles')
  }
  const trimmedPath = path.slice(0, 2 * MAX_PATH_BYTES)
  if (trimmedPath.length % 2 === 0) {
    // path length is even
    const packedPath = tightlyPackNibbles(trimmedPath)
    const nodeHashLow = nodeHash.slice(packedPath.length)
    return Uint8Array.from([...packedPath, ...nodeHashLow])
  } else {
    // path length is odd
    const packedPathHigh = tightlyPackNibbles(trimmedPath.slice(0, -1))
    const middleHigh = trimmedPath[trimmedPath.length - 1] << 4
    const middleLow = nodeHash[packedPathHigh.length] & 0xf
    const middleByte = middleHigh | middleLow
    const nodeHashLow = nodeHash.slice(packedPathHigh.length + 1)
    return Uint8Array.from([...packedPathHigh, middleByte, ...nodeHashLow])
  }
}
