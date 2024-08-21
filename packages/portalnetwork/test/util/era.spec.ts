import { readFileSync } from 'fs'
import { assert, beforeAll, describe, it } from 'vitest'

import { EraTypes, readEntry, readSlotIndex } from '../../src/era/index.js'
describe('parse entries', () => {
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
  it('should read the type and data correctly', () => {
    const data = new Uint8Array([
      0x22, 0x32, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    ])
    const entry = readEntry(data)
    assert.deepEqual(entry.type, new Uint8Array([0x22, 0x32]))
    assert.equal(entry.data.length, 4)
    assert.deepEqual(entry.data, data.slice(8))
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
})
