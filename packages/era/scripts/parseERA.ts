import { readFileSync } from 'fs'
import {
  readType,
  readERA1,
} from '../src/index.js'

const file = './scripts/era1/mainnet-00000-5ec1ffb8.era1'
const file2 = './scripts/era1/mainnet-01896-e6ebe562.era1'

function readBinaryFile(filePath: string): Uint8Array {
  const buffer = readFileSync(filePath)
  return new Uint8Array(buffer)
}

const main = async () => {
  const era1_0 = readBinaryFile(file)
  console.log('era1_0 length', era1_0.length / 1000 / 1000, 'MB')
  const { data, type, count, recordStart } = readType(era1_0)
  console.log('type', type)
  console.log('count', count)
  console.log('recordStart', recordStart)

  const entries = await readERA1(era1_0)
  for (let i = 0; i < 2; i++) {
    const { block, receipts, totalDifficulty } = (await entries!.next()).value!
    console.log({
      i,
      block: block.hash(),
      txs: block.transactions.length,
      receipts: receipts.length,
      totalDifficulty,
    })
  }
}

main()
