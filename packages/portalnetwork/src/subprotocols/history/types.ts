import {
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  UintBigintType,
} from '@chainsafe/ssz'
import { PostByzantiumTxReceipt, PreByzantiumTxReceipt, TxReceipt } from '@ethereumjs/vm'

/* ----------------- Constants ----------- */
// number of header records in a single epoch
export const EPOCH_SIZE = 8192
// maximum number of epoch accumulator root hashes stored in historical epochs array
export const MAX_HISTORICAL_EPOCHS = 131072
// Block Body SSZ encoding related constants
export const MAX_TRANSACTION_LENGTH = 2 ** 24
export const MAX_TRANSACTION_COUNT = 2 ** 14
export const MAX_RECEIPT_LENGTH = 2 ** 27
export const MAX_HEADER_LENGTH = 2 ** 13
export const MAX_ENCODED_UNCLES_LENGTH = MAX_HEADER_LENGTH * 2 ** 4

/* ----------------- Enums ----------- */
export enum HistoryNetworkContentTypes {
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
  bitvector: Buffer
  /**
   * Logs emitted
   */
  logs: Log[]
  /**
   * Intermediary state root
   */
  stateRoot?: Buffer
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
export type HistoryNetworkContentKey = {
  selector: HistoryNetworkContentTypes
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
export type Log = [address: Buffer, topics: Buffer[], data: Buffer]
export type rlpReceipt = [
  postStateOrStatus: Buffer,
  cumulativeGasUsed: Buffer,
  bitvector: Buffer,
  logs: Log[]
]

/**
 * TxReceiptWithType extends TxReceipt to provide:
 *  - txType: byte prefix for serializing typed tx receipts
 */
export type TxReceiptWithType = PreByzantiumTxReceiptWithType | PostByzantiumTxReceiptWithType
export type TxReceiptType = TxReceipt | TxReceiptWithType

/* ----------------- SSZ Type Aliases ----------- */
export const Bytes32Type = new ByteVectorType(32)
export const HashRootType = Bytes32Type
export const TotalDifficultyType = new UintBigintType(32)
export const LeafType = Bytes32Type
export const WitnessesType = new ListCompositeType(HashRootType, 2 ** 16)
export const GIndexType = new UintBigintType(4)
export const HistoryNetworkContentKeyType = new ByteVectorType(33)
export const HistoryNetworkContentType = new ContainerType({
  blockHash: HashRootType,
})
export const BlockHeaderType = HistoryNetworkContentType
export const BlockBodyType = HistoryNetworkContentType
export const ReceiptType = HistoryNetworkContentType
export const EpochAccumulatorType = HistoryNetworkContentType
export const ProofType = HistoryNetworkContentType
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
  MAX_HISTORICAL_EPOCHS
)
export const EpochAccumulator = new ListCompositeType(HeaderRecordType, EPOCH_SIZE)
export const HeaderAccumulatorType = new ContainerType({
  historicalEpochs: HistoricalEpochsType,
  currentEpoch: EpochAccumulator,
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
