import { digest as sha256 } from '@chainsafe/as-sha256'
import { distance } from '@chainsafe/discv5'
import { BranchNode, ExtensionNode, decodeNode } from '@ethereumjs/trie'
import { bytesToHex, bytesToUnprefixedHex, equalsBytes, hexToBytes } from '@ethereumjs/util'

import { packNibbles, unpackNibbles } from './nibbleEncoding.js'
import {
  AccountTrieNodeKey,
  AccountTrieNodeOffer,
  AccountTrieNodeRetrieval,
  ContractCodeKey,
  ContractCodeOffer,
  ContractRetrieval,
  StateNetworkContentType,
  StorageTrieNodeKey,
  StorageTrieNodeOffer,
  StorageTrieNodeRetrieval,
} from './types.js'

import type {
  TAccountTrieNodeKey,
  TContractCodeKey,
  TNibbles,
  TStorageTrieNodeKey,
} from './types.js'
import type { LeafNode } from '@ethereumjs/trie'

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
    const key = AccountTrieNodeKey.serialize({ path: Uint8Array.from(path), nodeHash })
    return Uint8Array.from([0x20, ...key])
  }
  static decode(key: Uint8Array): TAccountTrieNodeKey {
    return AccountTrieNodeKey.deserialize(key.slice(1))
  }
}

export class StorageTrieNodeContentKey {
  static encode({ addressHash, path, nodeHash }: TStorageTrieNodeKey): Uint8Array {
    const key = StorageTrieNodeKey.serialize({ addressHash, path, nodeHash })
    return Uint8Array.from([0x21, ...key])
  }
  static decode(key: Uint8Array): TStorageTrieNodeKey {
    return StorageTrieNodeKey.deserialize(key.slice(1))
  }
}

export class ContractCodeContentKey {
  static encode({ addressHash, codeHash }: TContractCodeKey): Uint8Array {
    const key = ContractCodeKey.serialize({ addressHash, codeHash })
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
    } else if ('addressHash' in opts) {
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
  const dbBytes = hexToBytes('0x' + dbContent)
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
  return bytesToHex(wrapped)
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

export const compareDistance = (nodeId: string, nodeA: Uint8Array, nodeB: Uint8Array) => {
  if (equalsBytes(nodeA, nodeB)) {
    return nodeA
  }
  const distanceA = distance(nodeId, nodeA.toString())
  const distanceB = distance(nodeId, nodeB.toString())
  return distanceA < distanceB ? nodeA : nodeB
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
  return bytesToUnprefixedHex(dbKey)
}

export function getDatabaseContent(type: StateNetworkContentType, content: Uint8Array) {
  let dbContent = new Uint8Array()
  switch (type) {
    case StateNetworkContentType.AccountTrieNode:
      dbContent = AccountTrieNodeRetrieval.deserialize(content).node
      break
    case StateNetworkContentType.ContractTrieNode:
      try {
        dbContent = StorageTrieNodeRetrieval.deserialize(content).node
      } catch {
        dbContent = StorageTrieNodeOffer.deserialize(content).storageProof.slice(-1)[0]
      }
      break
    case StateNetworkContentType.ContractByteCode:
      try {
        dbContent = ContractCodeOffer.deserialize(content).code
      } catch {
        dbContent = ContractRetrieval.deserialize(content).code
      }
      break
  }
  return bytesToUnprefixedHex(dbContent)
}

export function nextOffer(path: TNibbles, proof: Uint8Array[]) {
  if (proof.length === 1) {
    return { curRlp: proof[0], nodes: proof, newpaths: [] }
  }
  const nibbles = unpackNibbles(path)
  const nodes = [...proof]
  nodes.pop()
  const nextNode = decodeNode(nodes[nodes.length - 1])
  const newpaths = nibbles.slice(
    0,
    nextNode instanceof BranchNode
      ? -1
      : nextNode instanceof ExtensionNode
        ? -nextNode.key().length
        : 0,
  )
  return {
    nodes,
    newpaths,
  }
}

export function extractAccountProof(
  addressHash: Uint8Array,
  accountProof: Uint8Array[],
  blockHash: Uint8Array,
): [Uint8Array, Uint8Array] {
  const addressPath = bytesToUnprefixedHex(addressHash).split('')
  const nodeRLP = accountProof.slice(-1)[0]
  const nodeHash = sha256(nodeRLP)
  const accountNode = decodeNode(nodeRLP) as LeafNode
  const nodeNibbles = accountNode._nibbles.map((n) => n.toString(16))
  const nodePath = addressPath.slice(0, addressPath.length - nodeNibbles.length)
  const accountTrieNodeOffer = AccountTrieNodeOffer.serialize({
    blockHash,
    proof: accountProof,
  })
  const accountTrieOfferKey = AccountTrieNodeContentKey.encode({
    nodeHash,
    path: packNibbles(nodePath),
  })
  return [accountTrieOfferKey, accountTrieNodeOffer]
}
