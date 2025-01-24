import { bytesToHex } from "@ethereumjs/util"

export const EraTypes = {
  CompressedSignedBeaconBlockType: new Uint8Array([0x01, 0x00]),
  CompressedBeaconState: new Uint8Array([0x02, 0x00]),
  Empty: new Uint8Array([0x00, 0x00]),
  SlotIndex: new Uint8Array([0x69, 0x32]),
  CompressedHeader: new Uint8Array([0x03, 0x00]),
  CompressedBody: new Uint8Array([0x04, 0x00]),
  CompressedReceipts: new Uint8Array([0x05, 0x00]),
  TotalDifficulty: new Uint8Array([0x06, 0x00]),
  AccumulatorRoot: new Uint8Array([0x07, 0x00]),
  BlockIndex: new Uint8Array([0x66, 0x32]),
} as const

export type TEntry = keyof typeof EraTypes

export const EntryType: Record<string, TEntry> = {
  [bytesToHex(EraTypes.CompressedSignedBeaconBlockType)]: 'CompressedSignedBeaconBlockType',
  [bytesToHex(EraTypes.CompressedBeaconState)]: 'CompressedBeaconState',
  [bytesToHex(EraTypes.Empty)]: 'Empty',
  [bytesToHex(EraTypes.SlotIndex)]: 'SlotIndex',
  [bytesToHex(EraTypes.BlockIndex)]: 'BlockIndex',
  [bytesToHex(EraTypes.CompressedHeader)]: 'CompressedHeader',
  [bytesToHex(EraTypes.CompressedBody)]: 'CompressedBody',
  [bytesToHex(EraTypes.CompressedReceipts)]: 'CompressedReceipts',
  [bytesToHex(EraTypes.TotalDifficulty)]: 'TotalDifficulty',
  [bytesToHex(EraTypes.AccumulatorRoot)]: 'AccumulatorRoot',
}

export type e2StoreEntry = {
  type: Uint8Array
  data: Uint8Array
}

export type SlotIndex = {
  startSlot: number
  recordStart: number
  slotOffsets: number[]
}
