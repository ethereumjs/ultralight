import { concatBytes, equalsBytes } from '@ethereumjs/util'

import { EraTypes } from './types.js'

export const readEntry = (bytes: Uint8Array) => {
  const type = bytes.slice(0, 2)
  const lengthBytes = concatBytes(bytes.subarray(2, 8), new Uint8Array([0, 0]))
  const length = Number(new DataView(lengthBytes.buffer).getBigUint64(0, true))
  const data = length > 0 ? bytes.subarray(8, 8 + length) : new Uint8Array()
  return { type, data }
}

export const readSlotIndex = (bytes: Uint8Array) => {
  const recordEnd = bytes.length
  const countBytes = bytes.slice(recordEnd - 8)
  const count = Number(new DataView(countBytes.buffer).getBigInt64(0, true))
  const recordStart = recordEnd - (8 * count + 24)
  const slotIndexEntry = readEntry(bytes.subarray(recordStart, recordEnd))
  if (equalsBytes(slotIndexEntry.type, EraTypes.SlotIndex) === false) {
    throw new Error(`expected SlotIndex type, got ${slotIndexEntry.type}`)
  }

  const startSlot = Number(
    new DataView(slotIndexEntry.data.slice(0, 8).buffer).getBigInt64(0, true),
  )
  const slotOffsets = []

  for (let i = 0; i < count; i++) {
    const slotEntry = slotIndexEntry.data.subarray((i + 1) * 8, (i + 2) * 8)
    const slotOffset = new DataView(slotEntry.buffer, slotEntry.byteOffset).getBigInt64(0, true)
    slotOffsets.push(slotOffset)
  }
  return {
    startSlot,
    recordStart,
    slotOffsets,
  }
}
