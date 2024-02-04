import {
  BooleanType,
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  UintBigintType,
} from '@chainsafe/ssz'

export enum StateNetworkContentType {
  AccountTrieNode = 16, // 0x20
  ContractTrieNode = 17, // 0x21
  ContractByteCode = 18, // 0x22
}

/* ----------------- Ping.custom_data & Pong.custom_data ----------- */
/*
 * The custom_payload field of the Ping and Pong messages
 * is the serialization of an SSZ Container specified as custom_data:
 */
export type TPingPongPayload = { dataRadius: bigint }
export const PingPongPayload = new ContainerType({ dataRadius: new UintBigintType(32) })

/* ----------------- Paths (Nibbles) ----------- */
export const Nibble = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: 'a',
  11: 'b',
  12: 'c',
  13: 'd',
  14: 'e',
  15: 'f',
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
  e: 'e',
  f: 'f',
} as const
export type TNibble = keyof typeof Nibble
export type TNibblePair = [TNibble, TNibble] // 2 nibbles tightly packed into a single byte
export type TPackedNibbles = Array<TNibblePair>
export type TNibbles = {
  isOddLength: boolean
  packedNibbles: Uint8Array
}
export const NibblePair = new UintBigintType(32)
export const Nibbles = new ContainerType({
  isOddLength: new BooleanType(),
  packedNibbles: new ByteListType(32),
})

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
  address: Bytes20
  path: TNibbles
  nodeHash: Bytes32
}
export const StorageTrieNodeKey = new ContainerType({
  address: new ByteVectorType(20),
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
  address: Bytes20
  codeHash: Bytes32
}
export const ContractCodeKey = new ContainerType({
  address: new ByteVectorType(20),
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
export type StateRoot = Bytes32
export type StateRootHex = string
export type MPTWitnessNode = Uint8Array
export type Slot = Uint256
export type StorageTrieProofKey = {
  address: Address
  slot: Slot
  stateRoot: StateRoot
}
export type CodeHash = Bytes32
