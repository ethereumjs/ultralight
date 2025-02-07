import { Duplex } from 'stream'
import { concatBytes, equalsBytes } from '@ethereumjs/util'
import { createChainForkConfig } from '@lodestar/config'
import { ssz } from '@lodestar/types'
import { UnsnappyStream } from 'snappystream'

import { EraTypes } from './types.js'

import type { BeaconState, SignedBeaconBlock } from '@lodestar/types'
import type { SlotIndex, e2StoreEntry } from './types.js'

/**
 * Reads the first e2Store formatted entry from a string of bytes
 * @param bytes a Uint8Array containing one or more serialized {@link e2StoreEntry}
 * @returns a deserialized {@link e2StoreEntry}
 * @throws if the length of the entry read is greater than the possible number of bytes in the data element
 */
export const readEntry = (bytes: Uint8Array): e2StoreEntry => {
  if (bytes.length < 8) throw new Error(`invalid data length, got ${bytes.length}, expected at least 8`)
  const type = bytes.slice(0, 2)
  const lengthBytes = concatBytes(bytes.subarray(2, 8), new Uint8Array([0, 0]))
  const length = Number(
    new DataView(lengthBytes.buffer, lengthBytes.byteOffset).getBigUint64(0, true),
  )
  if (length > bytes.length) {
    // Check for overflow
    throw new Error(`invalid data length, got ${length}, expected max of ${bytes.length - 8}`)
  }

  const data = length > 0 ? bytes.subarray(8, 8 + length) : new Uint8Array()
  return { type, data }
}

/**
 * Deserializes an e2Store bytestring into a list of entries
 * @param bytes a Uint8Array representing a serialized list of {@link e2StoreEntry} elements
 * @returns an array of deserialized {@link e2StoreEntry} elements
 */
export const deserializeE2Store = (bytes: Uint8Array): e2StoreEntry[] => {
  const entries = []
  let offset = 0
  while (offset < bytes.length) {
    try {
      const entry = readEntry(bytes.slice(offset))
      entries.push(entry)
      // Move the pointer to the end of the current entry (8 byte header + the length of entry.data)
      offset += 8 + entry.data.length
    } catch (err: any) {
      if (err.message.includes('invalid data length') === true) {
        throw new Error(
          `invalid data length in entry ${entries.length}, ${(err.message as string).split('length,')[1]}`,
        )
      } else throw err
    }
  }
  return entries
}

/**
 * Reads a Slot Index from the end of a bytestring representing an era file
 * @param bytes a Uint8Array bytestring representing a {@link SlotIndex} plus any arbitrary prefixed data
 * @returns a deserialized {@link SlotIndex}
 */
export const readSlotIndex = (bytes: Uint8Array): SlotIndex => {
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
    const slotOffset = Number(new DataView(slotEntry.slice(0, 8).buffer).getBigInt64(0, true),)
    slotOffsets.push(slotOffset)
  }
  return {
    startSlot,
    recordStart,
    slotOffsets,
  }
}

/**
 * Reads a an era file and extracts the State and Block slot indices
 * @param eraContents a bytestring representing a serialized era file
 * @returns a dictionary containing the State and Block Slot Indices (if present)
 */
export const getEraIndexes = (
  eraContents: Uint8Array,
): { stateSlotIndex: SlotIndex; blockSlotIndex: SlotIndex | undefined } => {
  const stateSlotIndex = readSlotIndex(eraContents)
  let blockSlotIndex = undefined
  if (stateSlotIndex.startSlot > 0) {
    blockSlotIndex = readSlotIndex(eraContents.slice(0, stateSlotIndex.recordStart))
  }
  return { stateSlotIndex, blockSlotIndex }
}

/**
 *
 * @param compressedState a bytestring representing a snappy frame format compressed ssz serialized BeaconState
 * @returns a decompressed BeaconState object of the same time as returned by {@link ssz.deneb.BeaconState.deserialize()}
 * @throws if BeaconState cannot be found
 */
export const decompressBeaconState = async (
  compressedState: Uint8Array,
  startSlot: number,
): Promise<BeaconState> => {
  const forkConfig = createChainForkConfig({})
  const fork = forkConfig.getForkName(startSlot)
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

  stream.push(compressedState)
  const state = await new Promise((resolve, reject) => {
    unsnappy.on('data', (data: Uint8Array) => {
      try {
        const state = ssz[fork].BeaconState.deserialize(data)
        destroy()
        resolve(state)
        // eslint-disable-next-line
      } catch { }
    })
    unsnappy.on('end', (data: any) => {
      try {
        const state = ssz[fork].BeaconState.deserialize(data)
        destroy()
        resolve(state)
      } catch (err: any) {
        destroy()
        reject(`unable to deserialize data with reason - ${err.message}`)
      }
    })
    unsnappy.on('close', (data: any) => {
      try {
        const state = ssz[fork].BeaconState.deserialize(data)
        destroy()
        resolve(state)
      } catch (err: any) {
        destroy()
        reject(`unable to deserialize data with reason - ${err.message}`)
      }
    })
    stream.pipe(unsnappy)
  })
  return state as BeaconState
}

/**
 *
 * @param compressedBlock a bytestring representing a snappy frame format compressed ssz serialized SignedBeaconBlock
 * @returns a decompressed SignedBeaconBlock object of the same time as returned by {@link ssz.deneb.SignedBeaconBlock.deserialize()}
 * @throws if SignedBeaconBlock cannot be found
 */
export const decompressBeaconBlock = async (
  compressedBlock: Uint8Array,
  startSlot: number,
): Promise<SignedBeaconBlock> => {
  const forkConfig = createChainForkConfig({})
  const fork = forkConfig.getForkName(startSlot)
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

  stream.push(compressedBlock)
  const block = await new Promise((resolve, reject) => {
    unsnappy.on('data', (data: Uint8Array) => {
      try {
        const block = ssz[fork].SignedBeaconBlock.deserialize(data)
        destroy()
        resolve(block)
        // eslint-disable-next-line
      } catch { }
    })
    unsnappy.on('end', (data: any) => {
      try {
        const block = ssz[fork].SignedBeaconBlock.deserialize(data)
        destroy()
        resolve(block)
      } catch (err: any) {
        destroy()
        reject(`unable to deserialize data with reason - ${err.message}`)
      }
    })
    unsnappy.on('close', (data: any) => {
      try {
        const block = ssz[fork].SignedBeaconBlock.deserialize(data)
        destroy()
        resolve(block)
      } catch (err: any) {
        destroy()
        reject(`unable to deserialize data with reason - ${err.message}`)
      }
    })
    stream.pipe(unsnappy)
  })
  return block as SignedBeaconBlock
}

/**
 * Reads a an era file and yields a stream of decompressed SignedBeaconBlocks
 * @param eraFile Uint8Array a serialized era file
 * @returns a stream of decompressed SignedBeaconBlocks or undefined if no blocks are present
 */
// export async function* readBlocksFromEra(eraFile: Uint8Array) {
export async function* readBlocksFromEra(eraFile: Uint8Array): AsyncGenerator<SignedBeaconBlock | undefined> {
  const indices = getEraIndexes(eraFile)
  const maxBlocks = indices.blockSlotIndex?.slotOffsets.length;
  if (maxBlocks === undefined) {
    // Return early if no blocks are present
    return
  }

  for (let x = 0; x < maxBlocks; x++) {
    try {
      const blockEntry = readEntry(
        eraFile.slice(
          indices.blockSlotIndex!.recordStart + indices.blockSlotIndex!.slotOffsets[x]
        )
      );
      const block = await decompressBeaconBlock(blockEntry.data, indices.blockSlotIndex!.startSlot);
      yield block;
    } catch {
      // noop - we skip empty slots
    }
  }
}