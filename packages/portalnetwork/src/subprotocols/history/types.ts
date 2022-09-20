import {
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  NoneType,
  UintBigintType,
  UintNumberType,
  UnionType,
} from '@chainsafe/ssz'

/* ----------------- Constants ----------- */
// number of header records in a single epoch
export const EPOCH_SIZE = 8192
// maximum number of epoch accumulator root hashes stored in historical epochs array
const MAX_HISTORICAL_EPOCHS = 131072

// Block Body SSZ encoding related constants
export const MAX_TRANSACTION_LENGTH = 2 ** 24
export const MAX_TRANSACTION_COUNT = 2 ** 14
export const MAX_RECEIPT_LENGTH = 2 ** 27
export const MAX_HEADER_LENGTH = 2 ** 13
export const MAX_ENCODED_UNCLES_LENGTH = MAX_HEADER_LENGTH * 2 ** 4

/* ----------------- Types ----------- */
/**
 * @property blockHash - byte representation of the hex encoded block hash
 *
 */
export type HistoryNetworkContentKey = {
  blockHash: Uint8Array
}

export const BlockHeaderType = new ContainerType({
  blockHash: new ByteVectorType(32),
})

export const BlockBodyType = BlockHeaderType

export const ReceiptType = BlockHeaderType

export const ProofType = BlockHeaderType

export enum HistoryNetworkContentTypes {
  BlockHeader = 0,
  BlockBody = 1,
  Receipt = 2,
  EpochAccumulator = 3,
  HeaderAccumulator = 4,
  HeaderProof = 5,
}

export const HashRoot = new ByteVectorType(32)
export const Witnesses = new ListCompositeType(HashRoot, 2 ** 16)
export const gIndex = new UintBigintType(4)
// export const leaves = new ListCompositeType(HashRoot, 8192)

export const SszProof = new ContainerType({
  leaf: HashRoot,
  witnesses: Witnesses,
})

export const HeaderRecord = new ContainerType({
  blockHash: new ByteVectorType(32),
  totalDifficulty: new UintBigintType(32),
})

export type HeaderRecordType = {
  blockHash: Uint8Array
  totalDifficulty: bigint
}
export const EpochAccumulator = new ListCompositeType(HeaderRecord, EPOCH_SIZE)

export const HeaderAccumulatorType = new ContainerType({
  historicalEpochs: new ListCompositeType(new ByteVectorType(32), MAX_HISTORICAL_EPOCHS),
  currentEpoch: EpochAccumulator,
})

export type HeaderProofInterface = {
  epochRoot: Uint8Array
  gindex: bigint
  leaf: Uint8Array
  witnesses: Uint8Array[]
}

export const MasterAccumulatorType = new UnionType([new NoneType(), new ByteVectorType(32)])

export const HistoryNetworkContentKeyUnionType = new UnionType([
  BlockHeaderType,
  BlockBodyType,
  ReceiptType,
  new ByteVectorType(32),
  MasterAccumulatorType,
  ProofType,
])

export const sszTransaction = new ByteListType(MAX_TRANSACTION_LENGTH)
export const allTransactions = new ListCompositeType(sszTransaction, MAX_TRANSACTION_COUNT)
export const sszUncles = new ByteListType(MAX_ENCODED_UNCLES_LENGTH)
export const BlockBodyContentType = new ContainerType({
  allTransactions: allTransactions,
  sszUncles: sszUncles,
})
export type BlockBodyContent = { txsRlp: Buffer[]; unclesRlp: Uint8Array }

// Receipt Types

export type rlpReceipt = [
  postStateOrStatus: Buffer,
  cumulativeGasUsed: Buffer,
  bitvector: Buffer,
  logs: Log[]
]

export type Log = [address: Buffer, topics: Buffer[], data: Buffer]
export type TxReceipt = PreByzantiumTxReceipt | PostByzantiumTxReceipt

export const sszReceiptType = new ByteListType(MAX_RECEIPT_LENGTH)
export const sszReceiptsListType = new ListCompositeType(sszReceiptType, MAX_TRANSACTION_COUNT)

/**
 * Abstract interface with common transaction receipt fields
 */
export interface BaseTxReceipt {
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
}
/**
 * Pre-Byzantium receipt type with a field
 * for the intermediary state root
 */
export interface PreByzantiumTxReceipt extends BaseTxReceipt {
  /**
   * Intermediary state root
   */
  stateRoot: Buffer
}
/**
 * Receipt type for Byzantium and beyond replacing the intermediary
 * state root field with a status code field (EIP-658)
 */
export interface PostByzantiumTxReceipt extends BaseTxReceipt {
  /**
   * Status of transaction, `1` if successful, `0` if an exception occured
   */
  status: 0 | 1
}
/**
 * TxReceiptWithType extends TxReceipt to provide:
 *  - txType: byte prefix for serializing typed tx receipts
 */
export interface PreByzantiumTxReceiptWithType extends PreByzantiumTxReceipt {
  /* EIP-2718 Typed Transaction Envelope type */
  txType: number
}
export interface PostByzantiumTxReceiptWithType extends PostByzantiumTxReceipt {
  /* EIP-2718 Typed Transaction Envelope type */
  txType: number
}

/**
 * TxReceiptWithType extends TxReceipt to provide:
 *  - txType: byte prefix for serializing typed tx receipts
 */
export type TxReceiptWithType = PreByzantiumTxReceiptWithType | PostByzantiumTxReceiptWithType

export type TxReceiptType = TxReceipt | TxReceiptWithType
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
