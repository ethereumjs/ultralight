import {
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  NoneType,
  UintBigintType,
  UnionType,
  VectorCompositeType,
} from '@chainsafe/ssz'
import { PostByzantiumTxReceipt, PreByzantiumTxReceipt, TxReceipt } from '@ethereumjs/vm'
import { Bytes32Type } from '../types.js'

/* ----------------- Constants ----------- */
// number of header records in a single epoch
export const EPOCH_SIZE = 8192
// maximum number of epoch accumulator root hashes stored in historical epochs array
export const MAX_HISTORICAL_EPOCHS = 1897
// Block Body SSZ encoding related constants
export const MAX_TRANSACTION_LENGTH = 16777216 // 2 ** 24
export const MAX_TRANSACTION_COUNT = 16384 // 2 ** 14
export const MAX_RECEIPT_LENGTH = 134217728 // 2 ** 27
export const MAX_HEADER_LENGTH = 8192 // 2 ** 13
export const MAX_ENCODED_UNCLES_LENGTH = 131072 // MAX_HEADER_LENGTH * 2 ** 4

/* ----------------- Enums ----------- */
export enum HistoryNetworkContentType {
  BlockHeader = 0,
  BlockBody = 1,
  Receipt = 2,
  EpochAccumulator = 3,
  HeaderProof = 4,
}
export enum HistoryNetworkRetrievalMechanism {
  BlockHeaderByHash = 0,
  BlockBodyByHash = 1,
  BlockReceiptsByHash = 3,
  EpochAccumulatorByHash = 4,
}

/* ----------------- Interfaces ----------- */
export interface HeaderProofInterface {
  epochRoot: HashRoot
  gindex: GIndex
  leaf: Leaf
  witnesses: Witnesses
}
export interface PreByzantiumTxReceiptWithType extends PreByzantiumTxReceipt {
  /* EIP-2718 Typed Transaction Envelope type */
  txType: number
}
export interface PostByzantiumTxReceiptWithType extends PostByzantiumTxReceipt {
  /* EIP-2718 Typed Transaction Envelope type */
  txType: number
}
export interface IReceiptOpts {
  /**
   * Cumulative gas used in the block including this tx
   */
  cumulativeBlockGasUsed: bigint
  /**
   * Bloom bitvector
   */
  bitvector: Uint8Array
  /**
   * Logs emitted
   */
  logs: Log[]
  /**
   * Intermediary state root
   */
  stateRoot?: Uint8Array
  /**
   * Status of transaction, `1` if successful, `0` if an exception occured
   */
  status?: 0 | 1
  /* EIP-2718 Typed Transaction Envelope type */
  txType?: number
}

/* ----------------- Types ----------- */
export type HashRoot = Uint8Array
export type TotalDifficulty = bigint
export type Leaf = Uint8Array
export type Witnesses = Uint8Array[]
export type GIndex = bigint
export type ContentKey = {
  selector: HistoryNetworkContentType
  blockHash: HashRoot
}
export type SszProof = {
  leaf: HashRoot
  witnesses: Witnesses
}
export type HeaderRecord = {
  blockHash: HashRoot
  totalDifficulty: TotalDifficulty
}
export type HistoricalEpoch = Uint8Array
export type HeaderRecordList = Uint8Array[]
export type Rlp = Uint8Array
export type BlockBodyContent = { txsRlp: Rlp[]; unclesRlp: Rlp }
export type Log = [address: Uint8Array, topics: Uint8Array[], data: Uint8Array]
export type rlpReceipt = [
  postStateOrStatus: Uint8Array,
  cumulativeGasUsed: Uint8Array,
  bitvector: Uint8Array,
  logs: Log[],
]

/**
 * TxReceiptWithType extends TxReceipt to provide:
 *  - txType: byte prefix for serializing typed tx receipts
 */
export type TxReceiptWithType = PreByzantiumTxReceiptWithType | PostByzantiumTxReceiptWithType
export type TxReceiptType = TxReceipt | TxReceiptWithType

/* ----------------- SSZ Type Aliases ----------- */
export const HashRootType = Bytes32Type
export const TotalDifficultyType = new UintBigintType(32)
export const LeafType = Bytes32Type
export const WitnessesType = new ListCompositeType(HashRootType, 65536)
export const GIndexType = new UintBigintType(4)
export const ContentKeyType = new ByteVectorType(33)
export const SszProofType = new ContainerType({
  leaf: HashRootType,
  witnesses: WitnessesType,
})
export const HeaderRecordType = new ContainerType({
  blockHash: HashRootType,
  totalDifficulty: TotalDifficultyType,
})
export const HistoricalEpochType = Bytes32Type
export const HistoricalEpochsType = new ListCompositeType(
  HistoricalEpochType,
  MAX_HISTORICAL_EPOCHS,
)
export const EpochAccumulator = new ListCompositeType(HeaderRecordType, EPOCH_SIZE)
export const MasterAccumulatorType = new ContainerType({
  historicalEpochs: HistoricalEpochsType,
})
export const sszTransactionType = new ByteListType(MAX_TRANSACTION_LENGTH)
export const allTransactionsType = new ListCompositeType(sszTransactionType, MAX_TRANSACTION_COUNT)
export const sszUnclesType = new ByteListType(MAX_ENCODED_UNCLES_LENGTH)
export const BlockBodyContentType = new ContainerType({
  allTransactions: allTransactionsType,
  sszUncles: sszUnclesType,
})

export const sszReceiptType = new ByteListType(MAX_RECEIPT_LENGTH)
export const sszReceiptsListType = new ListCompositeType(sszReceiptType, MAX_TRANSACTION_COUNT)

export const AccumulatorProofType = new VectorCompositeType(Bytes32Type, 15)
export const BlockHeaderProofType = new UnionType([new NoneType(), AccumulatorProofType])

export const BlockHeaderWithProof = new ContainerType({
  header: new ByteListType(MAX_HEADER_LENGTH),
  proof: BlockHeaderProofType,
})
