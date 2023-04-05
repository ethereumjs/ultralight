import { digest as sha256 } from '@chainsafe/as-sha256'
import { Require } from '@chainsafe/ssz/lib/util/types.js'
import { bigIntToBuffer } from '@ethereumjs/util'
import { fromHexString, toHexString } from '../../util/discv5.js'

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

export interface IContentKeyOpts {
  address: string
  stateRoot?: Uint8Array
  slot?: bigint
  codeHash?: Uint8Array
}

export type TContentKeyOpts<TContent extends StateNetworkContentType> =
  TContent extends StateNetworkContentType.AccountTrieProof
    ? Require<IContentKeyOpts, 'stateRoot'>
    : TContent extends StateNetworkContentType.ContractStorageTrieProof
    ? Require<Require<IContentKeyOpts, 'slot'>, 'stateRoot'>
    : TContent extends StateNetworkContentType.ContractByteCode
    ? Require<IContentKeyOpts, 'codeHash'>
    : never

export type ContentKeyOpts =
  | TContentKeyOpts<StateNetworkContentType.AccountTrieProof>
  | TContentKeyOpts<StateNetworkContentType.ContractStorageTrieProof>
  | TContentKeyOpts<StateNetworkContentType.ContractByteCode>

const getAccountTrieProofKey = (
  opts: TContentKeyOpts<StateNetworkContentType.AccountTrieProof>
) => {
  const key = AccountTrieProofKeyType.serialize({
    address: fromHexString(opts.address),
    stateRoot: opts.stateRoot,
  })

  return Uint8Array.from([StateNetworkContentType.AccountTrieProof, ...key])
}
const getContractStorageTrieKey = (
  opts: TContentKeyOpts<StateNetworkContentType.ContractStorageTrieProof>
) => {
  const key = ContractStorageTrieKeyType.serialize({
    address: fromHexString(opts.address),
    slot: opts.slot,
    stateRoot: opts.stateRoot,
  })

  return Uint8Array.from([StateNetworkContentType.ContractStorageTrieProof, ...key])
}
const getContractByteCodeKey = (
  opts: TContentKeyOpts<StateNetworkContentType.ContractByteCode>
) => {
  const key = ContractByteCodeKeyType.serialize({
    address: fromHexString(opts.address),
    codeHash: opts.codeHash,
  })

  return Uint8Array.from([StateNetworkContentType.ContractByteCode, ...key])
}

export function getStateNetworkContentKey<T extends StateNetworkContentType>(
  opts: TContentKeyOpts<T>
): Uint8Array {
  return 'slot' in opts
    ? getContractStorageTrieKey(
        opts as TContentKeyOpts<StateNetworkContentType.ContractStorageTrieProof>
      )
    : 'codeHash' in opts
    ? getContractByteCodeKey(opts as TContentKeyOpts<StateNetworkContentType.ContractByteCode>)
    : getAccountTrieProofKey(opts as TContentKeyOpts<StateNetworkContentType.AccountTrieProof>)
}

export const decodeStateNetworkContentKey = <T extends StateNetworkContentType>(
  key: Uint8Array
): ContentKeyOpts => {
  const contentType: StateNetworkContentType = key[0]
  switch (contentType) {
    case StateNetworkContentType.AccountTrieProof: {
      const deserialized = AccountTrieProofKeyType.deserialize(key.slice(1))
      return {
        address: toHexString(deserialized.address),
        stateRoot: deserialized.stateRoot,
      } as TContentKeyOpts<StateNetworkContentType.AccountTrieProof>
    }
    case StateNetworkContentType.ContractStorageTrieProof: {
      const deserialized = ContractStorageTrieKeyType.deserialize(key.slice(1))
      return {
        address: toHexString(deserialized.address),
        slot: deserialized.slot,
        stateRoot: deserialized.stateRoot,
      } as TContentKeyOpts<StateNetworkContentType.ContractStorageTrieProof>
    }
    case StateNetworkContentType.ContractByteCode: {
      const deserialized = ContractByteCodeKeyType.deserialize(key.slice(1))
      return {
        address: toHexString(deserialized.address),
        codeHash: deserialized.codeHash,
      } as TContentKeyOpts<StateNetworkContentType.ContractByteCode>
    }
  }
}

export const getStateNetworkContentId = (opts: TContentKeyOpts<StateNetworkContentType>) => {
  return 'slot' in opts
    ? Uint8Array.from(
        bigIntToBuffer(
          BigInt(toHexString(sha256(fromHexString(opts.address)))) +
            (BigInt(toHexString(sha256(bigIntToBuffer(opts.slot!)))) % MODULO)
        )
      )
    : 'codeHash' in opts
    ? sha256(Buffer.concat([fromHexString(opts.address), opts.codeHash!]))
    : sha256(fromHexString(opts.address))
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
