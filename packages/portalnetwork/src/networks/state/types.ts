import {
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListBasicType,
  ListCompositeType,
  UintBigintType,
  UintNumberType,
} from '@chainsafe/ssz'

export enum StateNetworkContentType {
  AccountTrieProof = 16, // 0x10
  ContractStorageTrieProof = 17, // 0x11
  ContractByteCode = 18, // 0x12
}

/* ----------------- Types ----------- */
type Bytes32 = Uint8Array
export type Bytes20 = Uint8Array
export type Uint256 = BigInt
export type Address = Bytes20
export type StateRoot = Bytes32
export type StateRootHex = string
export type MPTWitnessNode = Uint8Array

export type TNibble = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
export type TNibblePair = [TNibble, TNibble]
export type TNibblesArray = Array<TNibblePair>

export const NibblePair = new UintNumberType(1)
export const Nibbles = new ListBasicType(NibblePair, 8)

export type AccountTrieNodeKey = {
  path: Uint8Array
  nodeHash: Bytes32
}

export type AccountTrieProofKey = {
  path: Address
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
}

export type ContractStorageTrieProof = {
  witness: MPTWitnessNode[]
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

export const NibbleType = new UintNumberType(1)
export const NibblesType = new ListBasicType(NibbleType, 8)

export const AccountTrieNodeKeyType = new ContainerType({
  path: Bytes32Type,
  nodeHash: Bytes32Type,
})

export type AccountTrieNodeOffer = {
  witnesses: MPTWitnessNode[]
}
export type AccountTrieNodeRequest = {
  node: MPTWitnessNode
}

export type AccountTrieNodeContent<T extends 'OFFER' | 'REQUEST'> = T extends 'OFFER'
  ? AccountTrieNodeOffer
  : AccountTrieNodeRequest

export const AccountTrieNodeOfferType = new ContainerType({
  witnesses: MPTWitnessesType,
})
export const AccountTrieNodeRequestType = new ContainerType({
  node: MPTWitnessNodeType,
})
export type AccountTrieNodeContentType<T extends 'OFFER' | 'REQUEST'> = T extends 'OFFER'
  ? typeof AccountTrieNodeOfferType
  : typeof AccountTrieNodeRequestType

export const AccountTrieProofKeyType = new ContainerType({
  address: Bytes20Type,
  stateRoot: StateRootType,
})

export const AccountTrieProofType = new ContainerType({
  witnesses: MPTWitnessesType,
})

export const ContractStorageTrieKeyType = new ContainerType({
  address: AddressType,
  slot: SlotType,
  stateRoot: StateRootType,
})

export const ContractStorageTrieProofType = new ContainerType({
  witnesses: MPTWitnessesType,
})

export const ContractByteCodeKeyType = new ContainerType({
  address: AddressType,
  codeHash: Bytes32Type,
})
export const ContractByteCodeType = new ByteListType(24576)
