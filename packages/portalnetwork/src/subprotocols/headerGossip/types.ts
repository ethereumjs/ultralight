import { ByteVectorType, ContainerType, ListCompositeType, UintBigintType } from '@chainsafe/ssz'

export const EPOCH_SIZE = 8192
const MAX_HISTORICAL_EPOCHS = 100000

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
