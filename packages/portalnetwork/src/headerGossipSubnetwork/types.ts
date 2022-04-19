import { ByteVector, ByteVectorType, ContainerType, ListType, BigIntUintType } from '@chainsafe/ssz'

export const EPOCH_SIZE = 8192
const MAX_HISTORICAL_EPOCHS = 8192

export const HeaderRecord = new ContainerType({
  fields: {
    blockHash: new ByteVectorType({ length: 32 }),
    totalDifficulty: new BigIntUintType({ byteLength: 32 }),
  },
})

export type HeaderRecordType = {
  blockHash: ByteVector
  totalDifficulty: bigint
}
export const EpochAccumulator = new ListType({ limit: EPOCH_SIZE, elementType: HeaderRecord })

export const HeaderAccumulator = new ContainerType({
  fields: {
    historicalEpochs: new ListType({
      limit: MAX_HISTORICAL_EPOCHS,
      elementType: new ByteVectorType({ length: 32 }),
    }),
    currentEpoch: EpochAccumulator,
  },
})

export type HeaderAccumulatorType = {
  historicalEpochs: ByteVector[]
  currentEpoch: HeaderRecordType[]
}
