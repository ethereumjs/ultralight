import { ByteVectorType, ContainerType, ListCompositeType } from '@chainsafe/ssz'
import { Bytes32Type } from '../types.js'
import { Nibbles, TrieNode, TrieProof, type AddressHash, type TNibbles, type TTrieProof } from '../state/types.js'

// Network content type definitions
export enum HeadStateNetworkContentType {
  AccountTrieDiff = 0x30,
  AccountTrieNode = 0x31,
  ContractTrieDiff = 0x32,
  ContractTrieNode = 0x33,
}

// Common type aliases
type BlockHash = Uint8Array
type Path = Uint8Array

// Trie node and diff base types
export const TrieNodeListType = new ListCompositeType(TrieNode, 65536)
export const TrieDiffType = new ContainerType({
  before: TrieNodeListType,
  after: TrieNodeListType,
})

// Account Trie types
export type AccountTrieNode = {
  path: TNibbles
  blockHash: BlockHash
}

export type AccountTrieNodeValue = {
  proof: TTrieProof
}

export type AccountTrieDiff = {
  path: Path
  blockHash: BlockHash
}

export type AccountTrieDiffValue = {
  subtrieDiff: {
    before: TTrieProof
    after: TTrieProof
  }
}

// Contract Trie types
export type ContractTrieNode = {
  path: TNibbles
  addressHash: AddressHash
  blockHash: BlockHash
}

export type ContractTrieNodeValue = {
  storageProof: TTrieProof
  accountProof: TTrieProof
}

export type ContractTrieDiff = {
  path: Path
  blockHash: BlockHash
}

export type ContractTrieDiffValue = {
  subtrieDiff: {
    before: TTrieProof
    after: TTrieProof
  }
  accountProof: TTrieProof
}

// SSZ serialization types
const PathType = new ByteVectorType(1)

export const AccountTrieNodeSszType = new ContainerType({
  path: Nibbles,
  blockHash: Bytes32Type,
})

export const AccountTrieNodeValueSszType = new ContainerType({
  proof: TrieProof,
})

export const AccountTrieDiffSszType = new ContainerType({
  path: PathType,
  blockHash: Bytes32Type,
})

export const AccountTrieDiffValueSszType = new ContainerType({
  subtrieDiff: TrieDiffType,
})

export const ContractTrieNodeSszType = new ContainerType({
  path: Nibbles,
  addressHash: Bytes32Type,
  blockHash: Bytes32Type,
})

export const ContractTrieNodeValueSszType = new ContainerType({
  storageProof: TrieProof,
  accountProof: TrieProof,
})

export const ContractTrieDiffSszType = new ContainerType({
  path: PathType,
  blockHash: Bytes32Type,
})

export const ContractTrieDiffValueSszType = new ContainerType({
  subtrieDiff: TrieDiffType,
  accountProof: TrieProof,
})

// Content type mapping
export type HeadStateNetworkContent<T extends HeadStateNetworkContentType> =
  T extends HeadStateNetworkContentType.AccountTrieDiff
    ? AccountTrieDiff
    : T extends HeadStateNetworkContentType.AccountTrieNode
      ? AccountTrieNode
      : T extends HeadStateNetworkContentType.ContractTrieDiff
        ? ContractTrieDiff
        : T extends HeadStateNetworkContentType.ContractTrieNode
          ? ContractTrieNode
          : never

export type HeadStateNetworkContentValue<T extends HeadStateNetworkContentType> =
  T extends HeadStateNetworkContentType.AccountTrieDiff
    ? AccountTrieDiffValue
    : T extends HeadStateNetworkContentType.AccountTrieNode
      ? AccountTrieNodeValue
      : T extends HeadStateNetworkContentType.ContractTrieDiff
        ? ContractTrieDiffValue
        : T extends HeadStateNetworkContentType.ContractTrieNode
          ? ContractTrieNodeValue
          : never

// Serialization helpers
const contentKeySerializers: {
  [T in HeadStateNetworkContentType]: {
    serialize: (content: HeadStateNetworkContent<T>) => Uint8Array
  }
} = {
  [HeadStateNetworkContentType.AccountTrieDiff]: AccountTrieDiffSszType,
  [HeadStateNetworkContentType.AccountTrieNode]: AccountTrieNodeSszType,
  [HeadStateNetworkContentType.ContractTrieDiff]: ContractTrieDiffSszType,
  [HeadStateNetworkContentType.ContractTrieNode]: ContractTrieNodeSszType,
}

const contentValueSerializers: {
  [T in HeadStateNetworkContentType]: {
    serialize: (content: HeadStateNetworkContentValue<T>) => Uint8Array
  }
} = {
  [HeadStateNetworkContentType.AccountTrieDiff]: AccountTrieDiffValueSszType,
  [HeadStateNetworkContentType.AccountTrieNode]: AccountTrieNodeValueSszType,
  [HeadStateNetworkContentType.ContractTrieDiff]: ContractTrieDiffValueSszType,
  [HeadStateNetworkContentType.ContractTrieNode]: ContractTrieNodeValueSszType,
}

export function getContentKey<T extends HeadStateNetworkContentType>(
  type: T,
  content: HeadStateNetworkContent<T>,
) {
  return Uint8Array.from([type, ...contentKeySerializers[type].serialize(content)])
}

export function getContentValue<T extends HeadStateNetworkContentType>(
  type: T,
  content: HeadStateNetworkContentValue<T>,
) {
  return contentValueSerializers[type].serialize(content)
}