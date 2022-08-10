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
const MAX_TRANSACTION_LENGTH = 2 ** 24
const MAX_TRANSACTION_COUNT = 2 ** 14
const MAX_RECEIPT_LENGTH = 2 ** 27
const MAX_HEADER_LENGTH = 2 ** 13
const MAX_ENCODED_UNCLES_LENGTH = MAX_HEADER_LENGTH * 2 ** 4

/* ----------------- Types ----------- */
/**
 * @property chainId - integer representing the chain ID (e.g. Ethereum Mainnet is 1)
 * @property blockHash - byte representation of the hex encoded block hash
 *
 */
export type HistoryNetworkContentKey = {
  chainId: number
  blockHash: Uint8Array
}

export const BlockHeaderType = new ContainerType({
  chainId: new UintNumberType(2),
  blockHash: new ByteVectorType(32),
})

export const BlockBodyType = BlockHeaderType

export const ReceiptType = BlockHeaderType

export enum HistoryNetworkContentTypes {
  BlockHeader = 0,
  BlockBody = 1,
  Receipt = 2,
  EpochAccumulator = 3,
  HeaderAccumulator = 4,
}

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

export type ProofView = {
  type: string
  gIndex: bigint
  leaf: Uint8Array
  witness: Uint8Array[]
}

export const MasterAccumulatorType = new UnionType([new NoneType(), new ByteVectorType(32)])

export const HistoryNetworkContentKeyUnionType = new UnionType([
  BlockHeaderType,
  BlockBodyType,
  ReceiptType,
  new ByteVectorType(32),
  MasterAccumulatorType,
])

export const sszTransaction = new ByteListType(MAX_TRANSACTION_LENGTH)
export const allTransactions = new ListCompositeType(sszTransaction, MAX_TRANSACTION_COUNT)
export const sszUncles = new ByteListType(MAX_ENCODED_UNCLES_LENGTH)
export const BlockBodyContentType = new ContainerType({
  allTransactions: allTransactions,
  sszUncles: sszUncles,
})
export type BlockBodyContent = { txsRlp: Buffer[]; unclesRlp: Uint8Array }

export const sszReceipt = new ByteListType(MAX_RECEIPT_LENGTH)

export const ReceiptsContentType = new ListCompositeType(sszReceipt, MAX_TRANSACTION_COUNT)
