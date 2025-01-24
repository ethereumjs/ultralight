import { readFileSync } from 'fs'
import {
  EntryType,
  EraTypes,
  readBlockIndex,
  readType,
  readERA1,
} from '../src'
import { bytesToHex } from '@ethereumjs/util'

const file = './scripts/era1/mainnet-00000-5ec1ffb8.era1'


function readBinaryFile(filePath: string): Uint8Array {
  const buffer = readFileSync(filePath)
  return new Uint8Array(buffer)
}

const main = async () => {
  const era1_0 = readBinaryFile(file)
  console.log('era1_0 length', era1_0.length / 1000 / 1000, 'MB')
  const entries = await readERA1(era1_0)
  for (let i = 0; i < 8192; i++) {
    const entry = await entries!.next()
    console.log(i, EntryType[bytesToHex((<any>entry.value).type)])
  }
}

main()
