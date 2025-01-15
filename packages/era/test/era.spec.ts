import { readFileSync } from 'fs'
import { assert, beforeAll, describe, it } from 'vitest'

import {
  EraTypes,
  decompressBeaconBlock,
  decompressBeaconState,
  deserializeE2Store,
  getEraIndexes,
  readBlocksFromEra,
  readEntry,
  readSlotIndex,
} from '../src/index.js'

describe('e2Store utilities', () => {
  const singleEntry = new Uint8Array([
    0x22, 0x32, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  ])
  const invalidHeaderEntry = new Uint8Array([
    0x22, 0x32, 0x19, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  ])
  const multipleEntries = new Uint8Array([
    0x22, 0x32, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ])
  it('should read the type and data correctly', () => {
    const entry = readEntry(singleEntry)
    assert.deepEqual(entry.type, new Uint8Array([0x22, 0x32]))
    assert.equal(entry.data.length, 4)
    assert.deepEqual(entry.data, singleEntry.slice(8))
  })
  it('should throw on entry with invalid length', () => {
    try {
      readEntry(invalidHeaderEntry)
      assert.fail('should have thrown on invalid data length')
    } catch (err: any) {
      assert.ok(err.message.includes('invalid data length'))
    }
  })
  it('should create an array of entries', () => {
    const entry = deserializeE2Store(singleEntry)
    assert.equal(entry.length, 1)
    const entries = deserializeE2Store(multipleEntries)
    assert.equal(entries.length, 2)
    assert.deepEqual(entries[1].type, EraTypes.Empty)
  })
})

describe('era utilities', () => {
  let data: Uint8Array
  beforeAll(() => {
    data = new Uint8Array(readFileSync(__dirname + '/mainnet-01183-595cb34b.era'))
  })
  it('should read the version header entry correctly', () => {
    const entry = readEntry(data)
    assert.deepEqual(entry.type, new Uint8Array([0x65, 0x32]))
    assert.equal(entry.data.length, 0)
  })
  it('should read a second entry entry correctly', () => {
    let pointer = 0
    const versionRecord = readEntry(data)
    pointer = pointer + 8 + versionRecord.data.length
    const secondRecord = readEntry(data.slice(pointer))
    pointer = pointer + 8 + secondRecord.data.length
    const thirdRecord = readEntry(data.slice(pointer))
    assert.deepEqual(secondRecord.type, EraTypes.CompressedSignedBeaconBlockType)
    assert.deepEqual(thirdRecord.type, EraTypes.CompressedSignedBeaconBlockType)

  })
  it('should read the state slotIndex', () => {
    const stateSlotIndex = readSlotIndex(data)
    assert.equal(
      stateSlotIndex.slotOffsets.length,
      1,
      'Should get 1 element, slot offset for state',
    )
    assert.equal(stateSlotIndex.startSlot, 9691136)
  })
  it('should read contents of era indices', () => {
    const indices = getEraIndexes(data)
    assert.equal(indices.blockSlotIndex!.startSlot, 9682944)
    assert.equal(indices.stateSlotIndex.startSlot, 9691136)
  })
})

describe('it should be able to extract beacon objects from an era file', () => {
  let data
  beforeAll(() => {
    data = new Uint8Array(readFileSync(__dirname + '/mainnet-01183-595cb34b.era'))
  })
  it('should extract the beacon state', async () => {
    const indices = getEraIndexes(data)
    const stateEntry = readEntry(
      data.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
    )
    assert.deepEqual(stateEntry.type, EraTypes.CompressedBeaconState)
    const state = await decompressBeaconState(stateEntry.data, indices.stateSlotIndex.startSlot)
    assert.equal(state.slot as any as Number, 9691136)
  }, 150000)
  it('should read a block from the era file and decompress it', async () => {
    const indices = getEraIndexes(data)
    const compressedBlock = readEntry(data.slice(indices.blockSlotIndex!.recordStart + indices.blockSlotIndex!.slotOffsets[0]))
    const block = (await decompressBeaconBlock(compressedBlock.data, indices.blockSlotIndex!.startSlot))
    assert.equal(block.message.slot, 9682944)
  })
  it('read blocks from an era file', async () => {
    let count = 0
    for await (const block of readBlocksFromEra(data)) {
      assert.exists(block.message.slot)
      count++
      if (count > 10) break
    }
  })
})
