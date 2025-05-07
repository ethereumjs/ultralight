import { ByteVectorType, ContainerType, ListCompositeType } from '@chainsafe/ssz'
import { Bytes32Type } from '../types.js'
import { Nibbles, TrieNode, TrieProof, type AddressHash, type TNibbles, type TTrieProof } from '../state/types.js'

export enum HeadStateNetworkContentType {
  AccountTrieDiff = 0x30,
  AccountTrieNode = 0x31,
  ContractTrieDiff = 0x32,
  ContractTrieNode = 0x33,
}

type BlockHash = Uint8Array

export type AccountTrieNode = {
  path: TNibbles
  blockHash: BlockHash
}

export const TrieNodeListType = new ListCompositeType(TrieNode, 65536)
export const TrieDiffType = new ContainerType({
  before: TrieNodeListType,
  after: TrieNodeListType,
})

export const AccountTrieNodeType = new ContainerType({
  path: Nibbles,
  blockHash: Bytes32Type,
})

export type TAccountTrieNodeValue = {
  proof: TTrieProof
}

export const AccountTrieNodeValue = new ContainerType({
  proof: TrieProof,
})

type Path = Uint8Array
const PathType = new ByteVectorType(1)

export type AccountTrieDiff = {
  path: Path
  blockHash: BlockHash
}

const AccountTrieDiffType = new ContainerType({
  path: PathType,
  blockHash: Bytes32Type,
})

export type TAccountTrieDiffValue = {
  subtrieDiff: {
    before: TTrieProof
    after: TTrieProof
  }
}

const AccountTrieDiffValue = new ContainerType({
  subtrieDiff: TrieDiffType,
})

export type ContractTrieNode = {
  path: TNibbles
  addressHash: AddressHash
  blockHash: BlockHash
}

export const ContractTrieNodeType = new ContainerType({
  path: Nibbles,
  addressHash: Bytes32Type,
  blockHash: Bytes32Type,
})

export type TContractTrieNodeValue = {
  storageProof: TTrieProof
  accountProof: TTrieProof
}

export const ContractTrieNodeValue = new ContainerType({
  storageProof: TrieProof,
  accountProof: TrieProof,
})

export type ContractTrieDiff = {
  path: Path
  blockHash: BlockHash
}

export const ContractTrieDiffType = new ContainerType({
  path: PathType,
  blockHash: Bytes32Type,
})

export type TContractTrieDiffValue = {
  subtrieDiff: {
    before: TTrieProof
    after: TTrieProof
  }
  accountProof: TTrieProof
}

const ContractTrieDiffValue = new ContainerType({
  subtrieDiff: TrieDiffType,
  accountProof: TrieProof,
})

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

const sszSerialize: {
  [T in HeadStateNetworkContentType]: {
    serialize: (content: HeadStateNetworkContent<T>) => Uint8Array
  }
} = {
  [HeadStateNetworkContentType.AccountTrieDiff]: AccountTrieDiffType,
  [HeadStateNetworkContentType.AccountTrieNode]: AccountTrieNodeType,
  [HeadStateNetworkContentType.ContractTrieDiff]: ContractTrieDiffType,
  [HeadStateNetworkContentType.ContractTrieNode]: ContractTrieNodeType,
}

export function getContentKey<T extends HeadStateNetworkContentType>(
  type: T,
  content: HeadStateNetworkContent<T>,
) {
    return Uint8Array.from([type, ...sszSerialize[type].serialize(content)])
}

type TContentValue<T extends HeadStateNetworkContentType> =
  T extends HeadStateNetworkContentType.AccountTrieDiff
    ? TAccountTrieDiffValue
    : T extends HeadStateNetworkContentType.AccountTrieNode
      ? TAccountTrieNodeValue
      : T extends HeadStateNetworkContentType.ContractTrieDiff
        ? TContractTrieDiffValue
        : T extends HeadStateNetworkContentType.ContractTrieNode
          ? TContractTrieNodeValue
          : never

export const serializeContentValue: {
  [T in HeadStateNetworkContentType]: {
    serialize: (content: TContentValue<T>) => Uint8Array
  }
} = {
  [HeadStateNetworkContentType.AccountTrieDiff]: AccountTrieDiffValue,
  [HeadStateNetworkContentType.AccountTrieNode]: AccountTrieNodeValue,
  [HeadStateNetworkContentType.ContractTrieDiff]: ContractTrieDiffValue,
  [HeadStateNetworkContentType.ContractTrieNode]: ContractTrieNodeValue,
}

export function getContentValue<T extends HeadStateNetworkContentType>(
  type: T,
  content: TContentValue<T>,
) {
  return serializeContentValue[type].serialize(content)
}