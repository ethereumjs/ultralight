import { digest as sha256 } from '@chainsafe/as-sha256'
import { Address, bigIntToBytes, concatBytes } from '@ethereumjs/util'
import { toHexString } from '../../util/discv5.js'

import {
  AccountTrieProofKeyType,
  ContractByteCodeKeyType,
  ContractStorageTrieKeyType,
  StateNetworkContentType,
} from './types.js'

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
  if (!opts.address) {
    throw new Error('address is required')
  }
  switch (opts.contentType) {
    case StateNetworkContentType.AccountTrieProof: {
      if (!opts.stateRoot) {
        throw new Error('stateRoot is required')
      }
      const key = AccountTrieProofKeyType.serialize({
        address: opts.address.toBytes(),
        stateRoot: opts.stateRoot,
      })
      return Uint8Array.from([opts.contentType, ...key])
    }
    case StateNetworkContentType.ContractStorageTrieProof: {
      if (!opts.slot || !opts.stateRoot) {
        throw new Error('required fields missing')
      }
      const key = ContractStorageTrieKeyType.serialize({
        address: opts.address.toBytes(),
        slot: opts.slot,
        stateRoot: opts.stateRoot,
      })
      return Uint8Array.from([opts.contentType, ...key])
    }
    case StateNetworkContentType.ContractByteCode: {
      if (!opts.codeHash) {
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
    case 0:
      return StateNetworkContentType.AccountTrieProof
    case 1:
      return StateNetworkContentType.ContractStorageTrieProof
    case 2:
      return StateNetworkContentType.ContractByteCode
    default:
      throw new Error('Invalid content key type')
  }
}

export const decodeStateNetworkContentKey = (
  key: Uint8Array,
):
  | {
      contentType: StateNetworkContentType.AccountTrieProof
      address: Uint8Array
      stateRoot: Uint8Array
    }
  | {
      contentType: StateNetworkContentType.ContractStorageTrieProof
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
      return { contentType: StateNetworkContentType.AccountTrieProof, address, stateRoot }
    }
    case 'ContractStorageTrieProof': {
      const { address, slot, stateRoot } = ContractStorageTrieKeyType.deserialize(key.slice(1))
      return {
        contentType: StateNetworkContentType.ContractStorageTrieProof,
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
    case StateNetworkContentType.AccountTrieProof: {
      return sha256(opts.address.toBytes())
    }
    case StateNetworkContentType.ContractStorageTrieProof: {
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
