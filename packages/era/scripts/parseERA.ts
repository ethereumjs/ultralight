import { readFileSync } from 'fs'
import {
  readType,
  readERA1,
  EraTypes,
  readBlockIndex,
  readBlockTupleAtIndex,
  readAccumulatorRoot,
  readOtherEntries,
} from '../src/index.js'
import { equalsBytes } from '@ethereumjs/util'

const file = './scripts/era1/mainnet-00000-5ec1ffb8.era1'
const file2 = './scripts/era1/mainnet-01896-e6ebe562.era1'

function readBinaryFile(filePath: string): Uint8Array {
  const buffer = readFileSync(filePath)
  return new Uint8Array(buffer)
}

export async function readStuff(bytes: Uint8Array) {
  const { data, type, count, recordStart } = readType(bytes)
  if (equalsBytes(type, EraTypes.BlockIndex)) {
    const { offsets } = readBlockIndex(data, count)
    const last = await readBlockTupleAtIndex(bytes, count - 1)
    const next = recordStart + offsets[count - 1] + last!.length
    console.log(bytes.slice(next, next + 8))
  }
}

const main = async () => {
  const era1_0 = readBinaryFile(file)
  console.log('era1_0 length', era1_0.length / 1000 / 1000, 'MB')
  const { data, type, count, recordStart } = readType(era1_0)
  console.log('type', type)
  console.log('count', count)
  console.log('recordStart', recordStart)
  
  const { otherEntries, accumulatorRoot } = await readOtherEntries(era1_0)
  console.log('accumulatorRoot', accumulatorRoot)
  console.log('otherEntries', otherEntries)
  
  
  const entries = await readERA1(era1_0)
  const { block, receipts, totalDifficulty } = (await entries!.next()).value!
  console.log({
    block: block.hash(),
    txs: block.transactions.length,
    receipts: receipts.length,
    totalDifficulty,
  })
}

main()
