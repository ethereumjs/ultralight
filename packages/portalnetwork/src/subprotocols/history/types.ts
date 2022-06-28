import {
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  UintBigintType,
  UintNumberType,
  UnionType,
} from '@chainsafe/ssz'

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

export const EPOCH_SIZE = 8192
const MAX_HISTORICAL_EPOCHS = 131072

export const HeaderRecord = new ContainerType({
  blockHash: new ByteVectorType(32),
  totalDifficulty: new UintBigintType(32),
})

export type HeaderRecordType = {
  blockHash: Uint8Array
  totalDifficulty: bigint
}
export const EpochAccumulator = new ListCompositeType(HeaderRecord, EPOCH_SIZE)
export type EpochAccumulatorType = {
  headerRecords: HeaderRecordType[]
}

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

export const HistoryNetworkContentKeyUnionType = new UnionType([
  BlockHeaderType,
  BlockBodyType,
  ReceiptType,
  new ByteVectorType(32),
  new ByteVectorType(32),
])
