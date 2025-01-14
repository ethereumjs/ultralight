/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  NoneType,
  UintBigintType,
  UnionType,
  VectorBasicType,
  VectorCompositeType,
} from '@chainsafe/ssz'

export enum StateNetworkContentType {
  AccountTrieNode = 0x20,
  ContractTrieNode = 0x21,
  ContractByteCode = 0x22,
}
/* ----------------- Paths (Nibbles) ----------- */
export const Nibble = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
}
export type TNibble = keyof typeof Nibble
export type TNibblePair = [TNibble, TNibble] // 2 nibbles tightly packed into a single byte
export type TPackedNibbles = Array<TNibblePair>
export type TNibbles = Uint8Array
export const NibblePair = new UintBigintType(32)
export const Nibbles = new ByteListType(33)
/* ----------------- Merkle Patricia Tire (MPT) Proofs ----------- */

export type TTrieNode = Uint8Array
export const TrieNode = new ByteListType(1024)
export type TTrieProof = Array<TTrieNode>
export const TrieProof = new ListCompositeType(TrieNode, 65)

/* ----------------- Account Trie Node ----------- */

export type TAccountTrieNodeKey = {
  path: TNibbles
  nodeHash: Bytes32
}
export const AccountTrieNodeKey = new ContainerType({
  path: Nibbles,
  nodeHash: new ByteVectorType(32),
})
export type TAccountTrieNodeOffer = {
  witnesses: MPTWitnessNode[]
  blockHash: Bytes32
}
export const AccountTrieNodeOffer = new ContainerType({
  proof: TrieProof,
  blockHash: new ByteVectorType(32),
})
export type TAccountTrieNodeRetrieval = {
  node: MPTWitnessNode
}
export const AccountTrieNodeRetrieval = new ContainerType({
  node: TrieNode,
})

/* ----------------- Contract Trie Node --------------------- */

export type TStorageTrieNodeKey = {
  addressHash: Bytes32
  path: TNibbles
  nodeHash: Bytes32
}
export const StorageTrieNodeKey = new ContainerType({
  addressHash: new ByteVectorType(32),
  path: Nibbles,
  nodeHash: new ByteVectorType(32),
})
export type TStorageTrieNodeOffer = {
  storageProof: TTrieProof
  accountProof: TTrieProof
  blockHash: Bytes32
}
export const StorageTrieNodeOffer = new ContainerType({
  storageProof: TrieProof,
  accountProof: TrieProof,
  blockHash: new ByteVectorType(32),
})
export type TStorageTrieNodeRetrieval = {
  node: MPTWitnessNode
}
export const StorageTrieNodeRetrieval = new ContainerType({
  node: TrieNode,
})

/* ----------------- Contract Code --------------------- */

export type TContractCodeKey = {
  addressHash: Bytes32
  codeHash: Bytes32
}
export const ContractCodeKey = new ContainerType({
  addressHash: new ByteVectorType(32),
  codeHash: new ByteVectorType(32),
})
export type TContractOffer = {
  code: Uint8Array
  accountProof: TTrieProof
  blockHash: Bytes32
}
export const ContractCodeOffer = new ContainerType({
  code: new ByteListType(32768),
  accountProof: TrieProof,
  blockHash: new ByteVectorType(32),
})
export type TContractRetrieval = {
  code: Uint8Array
}
export const ContractRetrieval = new ContainerType({ code: new ByteListType(32768) })

/* ----------------- Types ----------- */
type Bytes32 = Uint8Array
export type Bytes20 = Uint8Array
export type Uint256 = BigInt
export type Address = Bytes20
export type AddressHash = Bytes32
export type StateRoot = Bytes32
export type StateRootHex = string
export type MPTWitnessNode = Uint8Array
export type Slot = Uint256
export type StorageTrieProofKey = {
  addressHash: AddressHash
  slot: Slot
  stateRoot: StateRoot
}
export type CodeHash = Bytes32

type BlockNumber = number

const MAX_LENGTH = 2 ** 32 - 1

// MAX  number of storage changes in 1 ERA file
const MAX_STORAGE_CHANGES = 2 ** 32 - 1

const AccountBalance = new UintBigintType(16)

const BalanceChange = new VectorBasicType(new UintBigintType(16), 2)
const NonceChange = new VectorBasicType(new UintBigintType(16), 2)
const StorageChange = new VectorBasicType(new UintBigintType(32), 2)

const StorageChangeList = new ListCompositeType(StorageChange, MAX_STORAGE_CHANGES)

const AccountChange = new UnionType([BalanceChange, NonceChange])

const AccountChangeList = new ListCompositeType(AccountChange, 2)

new ListCompositeType(AccountChange, 2)
