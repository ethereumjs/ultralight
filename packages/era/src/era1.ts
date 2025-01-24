import { bytesToBigInt64, bytesToHex, equalsBytes } from '@ethereumjs/util'
import { readEntry } from './helpers.js'
import type { e2StoreEntry } from './types.js'
import { EraTypes } from './types.js'
import { UnsnappyStream } from 'snappystream'
import { Duplex } from 'stream'
import { Block, BlockHeader } from '@ethereumjs/block'
import { decodeReceipts } from 'portalnetwork'
import { UintBigintType } from '@chainsafe/ssz'

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
  const decompressed = await decompressData(entry.data)
  let data
  switch (bytesToHex(entry.type)) {
    case bytesToHex(EraTypes.CompressedHeader):
      data = BlockHeader.fromRLPSerializedHeader(decompressed, { setHardfork: true })
      break
    case bytesToHex(EraTypes.CompressedBody):
      data = Block.fromRLPSerializedBlock(decompressed, { setHardfork: true })
      break
    case bytesToHex(EraTypes.CompressedReceipts):
      data = decodeReceipts(decompressed)
      break
    case bytesToHex(EraTypes.TotalDifficulty):
      data = new UintBigintType(32).deserialize(decompressed)
      break
    case bytesToHex(EraTypes.AccumulatorRoot):
      data = decompressed
      break
    default:
      throw new Error(`unknown entry type - ${bytesToHex(entry.type)}`)
  }
  return { type: entry.type, data }
}

export async function* readBlocksFromERA1(bytes: Uint8Array, count: number, offsets: number[]) {
  for (let x = 0; x < count; x++) {
    try {
      const entry = readEntry(bytes.slice(offsets[x]))
      const { type, data } = await parseEntry(entry)
      yield { type, data }
    } catch {
      // noop - we skip empty slots
    }
  }
}

export async function readBlockEntryAt(bytes: Uint8Array, index: number) {
  const { data, type, count, recordStart } = readType(bytes)
  if (equalsBytes(type, EraTypes.BlockIndex)) {
    const { offsets } = readBlockIndex(data, count)
    const entry = readEntry(bytes.slice(recordStart + offsets[index]))
    const parsed = await parseEntry(entry)
    return parsed
  }
}

export async function readERA1(bytes: Uint8Array) {
  const { data, type, count, recordStart } = readType(bytes)
  if (equalsBytes(type, EraTypes.BlockIndex)) {
    const { offsets } = readBlockIndex(data, count)
    return readBlocksFromERA1(bytes.slice(recordStart), count, offsets)
  }
}
