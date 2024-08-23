export const EraTypes = {
  CompressedSignedBeaconBlockType: new Uint8Array([0x01, 0x00]),
  CompressedBeaconState: new Uint8Array([0x02, 0x00]),
  Empty: new Uint8Array([0x00, 0x00]),
  SlotIndex: new Uint8Array([0x69, 0x32]),
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
