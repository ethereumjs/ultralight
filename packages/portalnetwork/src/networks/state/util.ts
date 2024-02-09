import { digest as sha256 } from '@chainsafe/as-sha256'
import { distance } from '@chainsafe/discv5'
import { toHexString } from '@chainsafe/ssz'
import { MapDB, equalsBytes } from '@ethereumjs/util'

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
import type { BatchDBOp, DB } from '@ethereumjs/util'
import type { MemoryLevel } from 'memory-level'

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
export const tightlyPackNibbles = (nibbles: TNibble[]): TNibbles => {
  if (!nibbles.every((nibble) => Nibble[nibble] !== undefined)) {
    throw new Error(`path: [${nibbles}] must be an array of nibbles`)
  }
  const isOddLength = nibbles.length % 2 !== 0
  const nibbleArray = isOddLength ? ['0', ...nibbles] : nibbles
  const nibblePairs = Array.from({ length: nibbleArray.length / 2 }, (_, idx) => idx).map((i) => {
    return nibbleArray.slice(2 * i, 2 * i + 2) as [TNibble, TNibble]
  })
  const packedBytes = nibblePairs.map((nibbles) => {
    return parseInt(nibbles.join(''), 16)
  })
  return { isOddLength, packedNibbles: Uint8Array.from(packedBytes) }
}

export const compareDistance = (nodeId: string, nodeA: Uint8Array, nodeB: Uint8Array) => {
  if (equalsBytes(nodeA, nodeB)) {
    return nodeA
  }
  const distanceA = distance(nodeId, nodeA.toString())
  const distanceB = distance(nodeId, nodeB.toString())
  return distanceA < distanceB ? nodeA : nodeB
}

export class PortalTrieDB extends MapDB<string, Uint8Array> implements DB<string, Uint8Array> {
  db: MemoryLevel<string, Uint8Array>
  constructor(db: MemoryLevel<string, Uint8Array>) {
    super()
    this.db = db
  }
  async get(key: string) {
    return this.db.get(key)
  }
  async put(key: string, value: Uint8Array) {
    return this.db.put(key, value)
  }
  async del(key: string) {
    return this.db.del(key)
  }
  async batch(opStack: BatchDBOp<string, Uint8Array>[]): Promise<void> {
    for (const op of opStack) {
      if (op.type === 'del') {
        await this.del(op.key)
      }

      if (op.type === 'put') {
        await this.put(op.key, op.value)
      }
    }
  }
}
export function getDatabaseKey(contentKey: Uint8Array) {
  const type = keyType(contentKey)
  let dbKey = contentKey
  switch (type) {
    case StateNetworkContentType.AccountTrieNode:
      dbKey = AccountTrieNodeContentKey.decode(contentKey).nodeHash
      break
    case StateNetworkContentType.ContractTrieNode:
      dbKey = StorageTrieNodeContentKey.decode(contentKey).nodeHash
      break
    case StateNetworkContentType.ContractByteCode:
      dbKey = ContractCodeContentKey.decode(contentKey).codeHash
      break
    default:
      break
  }
  return toHexString(dbKey)
}
