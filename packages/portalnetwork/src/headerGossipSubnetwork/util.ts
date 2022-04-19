import { BlockHeader } from '@ethereumjs/block'
import { EpochAccumulator, EPOCH_SIZE, HeaderAccumulator, HeaderAccumulatorType } from './types'
export const updateAccumulator = (
  serializedAccumulator: Uint8Array,
  newHeader: BlockHeader
): Uint8Array => {
  const accumulator = HeaderAccumulator.deserialize(serializedAccumulator) as HeaderAccumulatorType
  const lastTd =
    accumulator.currentEpoch.length === 0
      ? 0n
      : accumulator.currentEpoch[accumulator.currentEpoch.length - 1].totalDifficulty

  console.log(accumulator, lastTd)
  if (accumulator.currentEpoch.length === EPOCH_SIZE) {
    const currentEpochHash = EpochAccumulator.hashTreeRoot(accumulator.currentEpoch)
    accumulator.historicalEpochs.push(currentEpochHash)
    accumulator.currentEpoch = []
  }

  const headerRecord = {
    blockHash: newHeader.hash(),
    totalDifficulty: lastTd + BigInt(newHeader.difficulty.toString(10)),
  }
  accumulator.currentEpoch.push(headerRecord)
  return HeaderAccumulator.serialize(accumulator)
}
