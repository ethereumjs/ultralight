import { digest as sha256 } from '@chainsafe/as-sha256'
import { distance } from '@chainsafe/discv5'
import { BranchMPTNode, ExtensionMPTNode, decodeMPTNode } from '@ethereumjs/mpt'
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

import type { LeafMPTNode } from '@ethereumjs/mpt'
import type {
  TAccountTrieNodeKey,
  TContractCodeKey,
  TNibbles,
  TStorageTrieNodeKey,
} from './types.js'

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

export function encodeAccountTrieNodeContentKey({
  path,
  nodeHash,
}: TAccountTrieNodeKey): Uint8Array {
  const key = AccountTrieNodeKey.serialize({ path: Uint8Array.from(path), nodeHash })
  return Uint8Array.from([0x20, ...key])
}

export function decodeAccountTrieNodeContentKey(key: Uint8Array): TAccountTrieNodeKey {
  return AccountTrieNodeKey.deserialize(key.slice(1))
}

export function encodeStorageTrieNodeContentKey({
  addressHash,
  path,
  nodeHash,
}: TStorageTrieNodeKey): Uint8Array {
  const key = StorageTrieNodeKey.serialize({ addressHash, path, nodeHash })
  return Uint8Array.from([0x21, ...key])
}

export function decodeStorageTrieNodeContentKey(key: Uint8Array): TStorageTrieNodeKey {
  return StorageTrieNodeKey.deserialize(key.slice(1))
}

export function encodeContractCodeContentKey({
  addressHash,
  codeHash,
}: TContractCodeKey): Uint8Array {
  const key = ContractCodeKey.serialize({ addressHash, codeHash })
  return Uint8Array.from([0x22, ...key])
}

export function decodeContractCodeContentKey(key: Uint8Array): TContractCodeKey {
  return ContractCodeKey.deserialize(key.slice(1))
}

export type TStateNetworkContentKey = TAccountTrieNodeKey | TStorageTrieNodeKey | TContractCodeKey

export function encodeStateNetworkContentKey(
  opts: TAccountTrieNodeKey | TStorageTrieNodeKey | TContractCodeKey,
): Uint8Array {
  if ('codeHash' in opts) {
    return encodeContractCodeContentKey(opts)
  } else if ('addressHash' in opts) {
    return encodeStorageTrieNodeContentKey(opts)
  } else {
    return encodeAccountTrieNodeContentKey(opts)
  }
}

export function decodeStateNetworkContentKey(key: Uint8Array): TStateNetworkContentKey {
  const type = keyType(key)
  if (type === StateNetworkContentType.ContractByteCode) {
    return decodeContractCodeContentKey(key)
  } else if (type === StateNetworkContentType.ContractTrieNode) {
    return decodeStorageTrieNodeContentKey(key)
  } else {
    return decodeAccountTrieNodeContentKey(key)
  }
}

export function fromKeyObjToStateNetworkContentId(
  key: TAccountTrieNodeKey | TStorageTrieNodeKey | TContractCodeKey,
): Uint8Array {
  const bytes = encodeStateNetworkContentKey(key)
  return sha256(bytes)
}

export function stateNetworkContentIdFromBytes(key: Uint8Array): Uint8Array {
  return sha256(key)
}

export function wrapDBContent(contentKey: Uint8Array, dbContent: string) {
  const keytype = keyType(contentKey)
  const dbBytes = hexToBytes(`0x${dbContent}`)
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
  if (equalsBytes(nodeA, nodeB) === true) {
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
      dbKey = decodeAccountTrieNodeContentKey(contentKey).nodeHash
      break
    case StateNetworkContentType.ContractTrieNode:
      dbKey = decodeStorageTrieNodeContentKey(contentKey).nodeHash
      break
    case StateNetworkContentType.ContractByteCode:
      dbKey = decodeContractCodeContentKey(contentKey).codeHash
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
  const nextNode = decodeMPTNode(nodes[nodes.length - 1])
  const newpaths = nibbles.slice(
    0,
    nextNode instanceof BranchMPTNode
      ? -1
      : nextNode instanceof ExtensionMPTNode
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
  const accountNode = decodeMPTNode(nodeRLP) as LeafMPTNode
  const nodeNibbles = accountNode._nibbles.map((n) => n.toString(16))
  const nodePath = addressPath.slice(0, addressPath.length - nodeNibbles.length)
  const accountTrieNodeOffer = AccountTrieNodeOffer.serialize({
    blockHash,
    proof: accountProof,
  })
  const accountTrieOfferKey = encodeAccountTrieNodeContentKey({
    nodeHash,
    path: packNibbles(nodePath),
  })
  return [accountTrieOfferKey, accountTrieNodeOffer]
}
