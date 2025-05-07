import { ByteVectorType, ContainerType, ListCompositeType } from '@chainsafe/ssz'
import { Bytes32Type } from '../types.js'
import { Nibbles, TrieNode, type AddressHash, type TNibbles } from '../state/types.js'

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

export const AccountTrieNodeType = new ContainerType({
  path: Nibbles,
  blockHash: Bytes32Type,
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

export type ContractTrieDiff = {
  path: Path
  blockHash: BlockHash
}

export const ContractTrieDiffType = new ContainerType({
  path: PathType,
  blockHash: Bytes32Type,
})

export const TrieNodeListType = new ListCompositeType(TrieNode, 65536)
export const TrieDiffType = new ContainerType({
  before: TrieNodeListType,
  after: TrieNodeListType,
})
