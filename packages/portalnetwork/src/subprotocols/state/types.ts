import { ByteVectorType, UintBigintType } from '@chainsafe/ssz'
import { Witnesses } from '../history'

export enum ContentType {
  AccountTrieProof = 0,
  ContractStorageTrieProof = 1,
  ContractByteCode = 2,
}

/* ----------------- Types ----------- */
export type Bytes32 = Uint8Array
export type Bytes20 = Uint8Array
export type Uint256 = BigInt
export type Address = Bytes20
export type StateRoot = Bytes32
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
export type ContractByteCode = {
  address: Address
  codeHash: CodeHash
}

export type AccountContractTrieProof = {
  witness: Witnesses
  nonce: BigInt
  balance: BigInt
  codeHash: Bytes32
  storageRoot: Bytes32
}
/* ----------------- SSZ Type Aliases ----------- */
export const Bytes32Type = new ByteVectorType(32)
export const Bytes20Type = new ByteVectorType(20)
export const AddressType = Bytes20Type
export const StateRootType = Bytes32Type
export const SlotType = new UintBigintType(32)
