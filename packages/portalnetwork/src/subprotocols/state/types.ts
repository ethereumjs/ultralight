import {
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  UintBigintType,
} from '@chainsafe/ssz'

export enum StateNetworkContentType {
  AccountTrieProof = 0,
  ContractStorageTrieProof = 1,
  ContractByteCode = 2,
}

/* ----------------- Types ----------- */
type Bytes32 = Uint8Array
export type Bytes20 = Uint8Array
export type Uint256 = BigInt
export type Address = Bytes20
export type StateRoot = Bytes32
export type StateRootHex = string
export type MPTWitnessNode = Uint8Array
export type AccountTrieProofKey = {
  address: Address
  stateRoot: StateRoot
}
export type Slot = Uint256
export type StorageTrieProofKey = {
  address: Address
  slot: Slot
  stateRoot: StateRoot
}
export type CodeHash = Bytes32

export type ContractByteCodeKey = {
  address: Address
  codeHash: CodeHash
}

export type AccountTrieProof = {
  witnesses: MPTWitnessNode[]
  nonce: bigint
  balance: bigint
  codeHash: Bytes32
  storageRoot: Bytes32
}

export type ContractStorageTrieProof = {
  witness: MPTWitnessNode[]
  data: Bytes32
}

export type ContractByteCode = Uint8Array

/* ----------------- SSZ Type Aliases ----------- */
const Bytes32Type = new ByteVectorType(32)
export const Bytes20Type = new ByteVectorType(20)
// MPT Witness nodes are RLP encoded arrays where each element is either empty or a 32 byte hash.
// The largest node is a branch node that is an array of 17 elements that are each either null, a 32 byte hash, or the value of the node (i.e. an account - 4 32 byte elements)
export const MPTWitnessNodeType = new ByteListType(667)
export const MPTWitnessesType = new ListCompositeType(MPTWitnessNodeType, 17) // A list of `MPTWitnessNodes` that can be as long as the MPT can be deep (i.e. 16 layers deep)
export const AddressType = Bytes20Type
export const StateRootType = Bytes32Type
export const SlotType = new UintBigintType(32)

export const AccountTrieProofKeyType = new ContainerType({
  address: Bytes20Type,
  stateRoot: StateRootType,
})

export const AccountTrieProofType = new ContainerType({
  witnesses: MPTWitnessesType,
  nonce: new UintBigintType(8),
  balance: new UintBigintType(32),
  codeHash: Bytes32Type,
  storageRoot: Bytes32Type,
})

export const ContractStorageTrieKeyType = new ContainerType({
  address: AddressType,
  slot: SlotType,
  stateRoot: StateRootType,
})

export const ContractStorageTrieProofType = new ContainerType({
  witnesses: MPTWitnessesType,
  data: Bytes32Type,
})

export const ContractByteCodeKeyType = new ContainerType({
  address: AddressType,
  codeHash: Bytes32Type,
})
export const ContractByteCodeType = new ByteListType(24576)
