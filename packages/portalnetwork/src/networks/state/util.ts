import { digest as sha256 } from '@chainsafe/as-sha256'
import { distance } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { BranchNode, ExtensionNode, decodeNode } from '@ethereumjs/trie'
import { MapDB, equalsBytes, padToEven } from '@ethereumjs/util'

import {
  AccountTrieNodeKey,
  AccountTrieNodeRetrieval,
  ContractCodeKey,
  ContractRetrieval,
  Nibble,
  StateNetworkContentType,
  StorageTrieNodeKey,
  StorageTrieNodeRetrieval,
} from './types.js'

import type {
  TAccountTrieNodeKey,
  TContractCodeKey,
  TNibble,
  TNibbles,
  TStorageTrieNodeKey,
} from './types.js'
import type { DB, EncodingOpts } from '@ethereumjs/util'
import type { AbstractLevel } from 'abstract-level'

/* ContentKeys */

export const keyType = (contentKey: Uint8Array): StateNetworkContentType => {
  switch (contentKey[0]) {
    case 32:
      return StateNetworkContentType.AccountTrieNode
    case 33:
      return StateNetworkContentType.ContractTrieNode
    case 34:
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

export function wrapDBContent(contentKey: Uint8Array, dbContent: string) {
  const keytype = keyType(contentKey)
  const dbBytes = fromHexString('0x' + dbContent)
  const wrapped =
    keytype === StateNetworkContentType.AccountTrieNode
      ? AccountTrieNodeRetrieval.serialize({
          node: dbBytes,
        })
      : keytype === StateNetworkContentType.ContractTrieNode
        ? StorageTrieNodeRetrieval.serialize({
            node: dbBytes,
          })
        : ContractRetrieval.serialize({
            code: dbBytes,
          })
  return toHexString(wrapped)
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
    return nibbleArray
      .slice(2 * i, 2 * i + 2)
      .map((b) => (typeof b === 'number' ? b.toString(16) : b))
  })
  const packedBytes = nibblePairs.map((nibbles) => {
    return parseInt(nibbles.join(''), 16)
  })
  return { isOddLength, packedNibbles: Uint8Array.from(packedBytes) }
}

export const unpackNibbles = (packedNibbles: Uint8Array, isOddLength: boolean) => {
  const bytes = [...packedNibbles]
  const byteArray = bytes.map((b) => padToEven(b.toString(16)).split('')).flat()
  return byteArray.slice(isOddLength ? 1 : 0)
}

export const compareDistance = (nodeId: string, nodeA: Uint8Array, nodeB: Uint8Array) => {
  if (equalsBytes(nodeA, nodeB)) {
    return nodeA
  }
  const distanceA = distance(nodeId, nodeA.toString())
  const distanceB = distance(nodeId, nodeB.toString())
  return distanceA < distanceB ? nodeA : nodeB
}

export class PortalTrieDB extends MapDB<string, string> implements DB<string, string> {
  db: AbstractLevel<string, string, string>
  temp: Map<string, string>
  constructor(db: AbstractLevel<string, string, string>) {
    super()
    this.db = db
    this.temp = new Map()
  }
  async put(key: string, value: string) {
    return this.db.put(key, value)
  }
  async get(key: string, _opts?: EncodingOpts) {
    try {
      const value = await this.db.get(key)
      return value
    } catch (e) {
      const found = this.temp.get(key)
      return found
    }
  }
  async del(key: string) {
    await this.db.del(key)
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
  return toHexString(dbKey).slice(2)
}

export function getDatabaseContent(type: StateNetworkContentType, content: Uint8Array) {
  let dbContent = new Uint8Array()
  switch (type) {
    case StateNetworkContentType.AccountTrieNode:
      dbContent = AccountTrieNodeRetrieval.deserialize(content).node
      break
    case StateNetworkContentType.ContractTrieNode:
      dbContent = StorageTrieNodeRetrieval.deserialize(content).node
      break
    case StateNetworkContentType.ContractByteCode:
      dbContent = ContractRetrieval.deserialize(content).code
      break
  }
  return toHexString(dbContent).slice(2)
}

export async function nextOffer(path: TNibbles, proof: Uint8Array[]) {
  if (proof.length === 0) {
    return
  }
  if (proof.length === 1) {
    return { curRlp: proof[0], nodes: proof, newpaths: [] }
  }
  const nibbles = unpackNibbles(path.packedNibbles, path.isOddLength)
  const nodes = [...proof]
  const curRlp = nodes.pop()!
  const curNode = decodeNode(curRlp)
  const newpaths = nibbles.slice(
    0,
    curNode instanceof BranchNode ? 1 : curNode instanceof ExtensionNode ? curNode.key().length : 0,
  )
  return {
    curRlp,
    nodes,
    newpaths,
  }
}
