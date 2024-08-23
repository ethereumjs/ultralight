import { decompressBeaconState, getEraIndexes, readEntry } from 'e2store'
import { readFileSync } from 'fs'

const main = async () => {
  const data = new Uint8Array(readFileSync('./mainnet-01183-595cb34b.era'))
  const indices = getEraIndexes(data)
  const stateEntry = readEntry(
    data.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
  )
  const state = await decompressBeaconState(stateEntry.data)
  console.log(state.slot)
}

void main()
