import { digest as sha256 } from '@chainsafe/as-sha256'
import { distance } from '@chainsafe/discv5'
import { equalsBytes } from '@ethereumjs/util'

import {
  AccountTrieNodeKey,
  ContractCodeKey,
  Nibble,
  StateNetworkContentType,
  StorageTrieNodeKey,
} from './types.js'

import type {
  TAccountTrieNodeKey,
  TContractCodeKey,
  TNibble,
  TNibbles,
  TStorageTrieNodeKey,
} from './types.js'

export const MODULO = 2n ** 256n
const MID = 2n ** 255n

/**
 * Calculates the distance between two ids using the distance function defined here
 * https://github.com/ethereum/portal-network-specs/blob/master/state-network.md#distance-function
 */

/* ContentKeys */

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
export class AccountTrieNodeContentKey {
  static encode({ path, nodeHash }: TAccountTrieNodeKey): Uint8Array {
    const key = AccountTrieNodeKey.serialize({ path, nodeHash })
    return Uint8Array.from([0x20, ...key])
  }
  static decode(key: Uint8Array): TAccountTrieNodeKey {
    return AccountTrieNodeKey.deserialize(key.slice(1))
  }
}

export class StorageTrieNodeContentKey {
  static encode({ address, path, nodeHash }: TStorageTrieNodeKey): Uint8Array {
    const key = StorageTrieNodeKey.serialize({ address, path, nodeHash })
    return Uint8Array.from([0x21, ...key])
  }
  static decode(key: Uint8Array): TStorageTrieNodeKey {
    return StorageTrieNodeKey.deserialize(key.slice(1))
  }
}

export class ContractCodeContentKey {
  static encode({ address, codeHash }: TContractCodeKey): Uint8Array {
    const key = ContractCodeKey.serialize({ address, codeHash })
    return Uint8Array.from([0x22, ...key])
  }
  static decode(key: Uint8Array): TContractCodeKey {
    return ContractCodeKey.deserialize(key.slice(1))
  }
}
export type TStateNetworkContentKey = TAccountTrieNodeKey | TStorageTrieNodeKey | TContractCodeKey
export class StateNetworkContentKey {
  static encode(opts: TAccountTrieNodeKey | TStorageTrieNodeKey | TContractCodeKey): Uint8Array {
    if ('codeHash' in opts) {
      return ContractCodeContentKey.encode(opts)
    } else if ('address' in opts) {
      return StorageTrieNodeContentKey.encode(opts)
    } else {
      return AccountTrieNodeContentKey.encode(opts)
    }
  }
  static decode(key: Uint8Array): TStateNetworkContentKey {
    const type = keyType(key)
    if (type === StateNetworkContentType.ContractByteCode) {
      return ContractCodeContentKey.decode(key)
    } else if (type === StateNetworkContentType.ContractTrieNode) {
      return StorageTrieNodeContentKey.decode(key)
    } else {
      return AccountTrieNodeContentKey.decode(key)
    }
  }
}

export class StateNetworkContentId {
  static fromKeyObj(key: TAccountTrieNodeKey | TStorageTrieNodeKey | TContractCodeKey): Uint8Array {
    const bytes = StateNetworkContentKey.encode(key)
    return sha256(bytes)
  }
  static fromBytes(key: Uint8Array): Uint8Array {
    return sha256(key)
  }
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

/**
 * Take a bytestring of loosely packed nibbles and return them tightly packed
 * @param nibbles array of loosely packed nibbles
 * [1, 2, a, b] -> Nibbles(is_odd_length=false, packed_nibbles=[0x12, 0xab])
 * [1, 2, a, b, c] -> Nibbles(is_odd_length=true, packed_nibbles=[0x01, 0x2a, 0xbc])
 */
export const tightlyPackNibbles = (_nibbles: TNibble[]): TNibbles => {
  if (!_nibbles.every((nibble) => Nibble[nibble] !== undefined)) {
    throw new Error(`path: [${_nibbles}] must be an array of nibbles`)
  }
  const nibbles: number[] = _nibbles.map((nibble) =>
    typeof nibble === 'string' ? parseInt(nibble, 16) : nibble,
  )
  const isOddLength = nibbles.length % 2 !== 0
  const nibbleArray = isOddLength ? [0, ...nibbles] : nibbles
  const nibblePairs = Array.from({ length: nibbleArray.length / 2 }, (_, idx) => idx).map((i) => {
    return nibbleArray.slice(2 * i, 2 * i + 2) as [TNibble, TNibble]
  })
  const packedBytes = nibblePairs.map(([a, b]) => {
    return parseInt(a.toString(16) + b.toString(16), 16)
  })
  return { isOddLength, packedNibbles: Uint8Array.from(packedBytes) }
}

export const unpackNibbles = (packedNibbles: Uint8Array, isOddLength: boolean): TNibble[] => {
  const unpacked = packedNibbles.reduce((acc, byte, _idx, _array) => {
    acc.push((byte >>> 4) as TNibble)
    acc.push((byte & 0x0f) as TNibble)
    return acc
  }, [] as TNibble[])
  return isOddLength ? unpacked.slice(1) : unpacked
}

export const compareDistance = (nodeId: string, nodeA: Uint8Array, nodeB: Uint8Array) => {
  if (equalsBytes(nodeA, nodeB)) {
    return nodeA
  }
  const distanceA = distance(nodeId, nodeA.toString())
  const distanceB = distance(nodeId, nodeB.toString())
  return distanceA < distanceB ? nodeA : nodeB
}
