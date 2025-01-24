import { bytesToBigInt64, bytesToHex, equalsBytes } from '@ethereumjs/util'
import { readEntry } from './helpers.js'
import type { e2StoreEntry } from './types.js'
import { EraTypes } from './types.js'
import { UnsnappyStream } from 'snappystream'
import { Duplex } from 'stream'
import type { BlockBytes} from '@ethereumjs/block';
import { Block } from '@ethereumjs/block'
import { UintBigintType } from '@chainsafe/ssz'
import { RLP } from '@ethereumjs/rlp'

export function readType(bytes: Uint8Array) {
  const count = Number(bytesToBigInt64(bytes.slice(-8), true))
  const recordLength = 8 * count + 24
  const recordEnd = bytes.length
  const recordStart = recordEnd - recordLength
  const { data, type } = readEntry(bytes.subarray(recordStart, recordEnd))
  return { data, type, count, recordStart }
}

export function readBlockIndex(data: Uint8Array, count: number) {
  const startingNumber = Number(new DataView(data.slice(0, 8).buffer).getBigInt64(0, true))
  const offsets: number[] = []
  for (let i = 0; i < count; i++) {
    const slotEntry = data.subarray((i + 1) * 8, (i + 2) * 8)
    const offset = Number(new DataView(slotEntry.slice(0, 8).buffer).getBigInt64(0, true))
    offsets.push(offset)
  }
  return {
    startingNumber,
    offsets,
  }
}

export async function decompressData(compressedData: Uint8Array) {
  const unsnappy = new UnsnappyStream()
  const stream = new Duplex()
  const destroy = () => {
    unsnappy.destroy()
    stream.destroy()
  }
  stream.on('error', (err) => {
    if (err.message.includes('_read() method is not implemented')) {
      // ignore errors about unimplemented methods
      return
    } else {
      throw err
    }
  })

  stream.push(compressedData)
  const data: Uint8Array = await new Promise((resolve, reject) => {
    unsnappy.on('data', (data: Uint8Array) => {
      try {
        destroy()
        resolve(data)
        // eslint-disable-next-line
      } catch {}
    })
    unsnappy.on('end', (data: any) => {
      try {
        destroy()
        resolve(data)
      } catch (err: any) {
        destroy()
        reject(`unable to deserialize data with reason - ${err.message}`)
      }
    })
    unsnappy.on('close', (data: any) => {
      try {
        destroy()
        resolve(data)
      } catch (err: any) {
        destroy()
        reject(`unable to deserialize data with reason - ${err.message}`)
      }
    })
    stream.pipe(unsnappy)
  })
  return data
}

export async function parseEntry(entry: e2StoreEntry) {
  if (equalsBytes(entry.type, EraTypes.TotalDifficulty)) {
    return { type: entry.type, data: new UintBigintType(32).deserialize(entry.data) }
  }
  const decompressed = await decompressData(entry.data)
  let data
  switch (bytesToHex(entry.type)) {
    case bytesToHex(EraTypes.CompressedHeader):
      data = RLP.decode(decompressed)
      break
    case bytesToHex(EraTypes.CompressedBody): {
      const [txs, uncles, withdrawals] = RLP.decode(decompressed)
      data = { txs, uncles, withdrawals }
      break
    }
    case bytesToHex(EraTypes.CompressedReceipts):
      data = decompressed
      data = RLP.decode(decompressed)
      break
    case bytesToHex(EraTypes.AccumulatorRoot):
      data = decompressed
      break
    default:
      throw new Error(`unknown entry type - ${bytesToHex(entry.type)}`)
  }
  return { type: entry.type, data }
}

export async function parseBlockTuple({
  headerEntry,
  bodyEntry,
  receiptsEntry,
  totalDifficultyEntry,
}: {
  headerEntry: e2StoreEntry
  bodyEntry: e2StoreEntry
  receiptsEntry: e2StoreEntry
  totalDifficultyEntry: e2StoreEntry
}): Promise<{ header: any; body: any; receipts: any; totalDifficulty: any }> {
  const header = await parseEntry(headerEntry)
  const body = await parseEntry(bodyEntry)
  const receipts = await parseEntry(receiptsEntry)
  const totalDifficulty = await parseEntry(totalDifficultyEntry)
  return { header, body, receipts, totalDifficulty }
}

export function readBlockTupleFromERA1(
  bytes: Uint8Array,
  recordStart: number,
  offsets: number[],
  x: number,
) {
  const headerEntry = readEntry(bytes.slice(recordStart + offsets[x]))
  const length = headerEntry.data.length + 8
  const bodyEntry = readEntry(bytes.slice(recordStart + offsets[x] + length))
  const receiptsEntry = readEntry(
    bytes.slice(recordStart + offsets[x] + length + bodyEntry.data.length + 8),
  )
  const totalDifficultyEntry = readEntry(
    bytes.slice(
      recordStart +
        offsets[x] +
        length +
        bodyEntry.data.length +
        8 +
        receiptsEntry.data.length +
        8,
    ),
  )
  return { headerEntry, bodyEntry, receiptsEntry, totalDifficultyEntry }
}

export async function* readBlockTuplesFromERA1(
  bytes: Uint8Array,
  count: number,
  offsets: number[],
  recordStart: number,
) {
  for (let x = 0; x < count; x++) {
    try {
      const { headerEntry, bodyEntry, receiptsEntry, totalDifficultyEntry } = readBlockTupleFromERA1(bytes, recordStart, offsets, x)
      const { header, body, receipts, totalDifficulty } = await parseBlockTuple({
        headerEntry,
        bodyEntry,
        receiptsEntry,
        totalDifficultyEntry,
      })
      const valuesArray = [header.data, body.data.txs, body.data.uncles, body.data.withdrawals]
      const block = Block.fromValuesArray(valuesArray as BlockBytes, { setHardfork: true })
      yield { block, receipts: receipts.data, totalDifficulty: totalDifficulty.data }
    } catch {
      // noop - we skip empty slots
    }
  }
}

export async function readERA1(bytes: Uint8Array) {
  const { data, type, count, recordStart } = readType(bytes)
  if (equalsBytes(type, EraTypes.BlockIndex)) {
    const { offsets } = readBlockIndex(data, count)
    return readBlockTuplesFromERA1(bytes, count, offsets, recordStart)
  }
}

export async function readBlockTupleAtIndex(bytes: Uint8Array, index: number) {
  const { data, type, count, recordStart } = readType(bytes)
  if (equalsBytes(type, EraTypes.BlockIndex)) {
    const { offsets } = readBlockIndex(data, count)
    const { headerEntry, bodyEntry, receiptsEntry, totalDifficultyEntry } = readBlockTupleFromERA1(bytes, recordStart, offsets, index)
    const { header, body, receipts, totalDifficulty } = await parseBlockTuple({
      headerEntry,
      bodyEntry,
      receiptsEntry,
      totalDifficultyEntry,
    })
    return { header, body, receipts, totalDifficulty }
  }
}
