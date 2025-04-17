import { readFileSync } from 'fs'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { assert, describe, it } from 'vitest'
import {
  BlockHeaderWithProof,
  HistoryNetworkContentType,
  NetworkId,
  createPortalNetwork,
  getContentKey,
} from '../../../src/index.js'

import path from 'path'
import { createBlockHeaderFromRLP } from '@ethereumjs/block'
import type { HistoryNetwork } from '../../../src/index.js'

const headerWithProof = JSON.parse(
  readFileSync(path.join(__dirname, './testData/block207686.json'), 'utf-8'),
)

const serializedHeader = BlockHeaderWithProof.deserialize(hexToBytes(headerWithProof.header))
const header = createBlockHeaderFromRLP(serializedHeader.header, { setHardfork: true })
const hash = bytesToHex(header.hash())

describe('BlockIndex', async () => {
  const ultralight = await createPortalNetwork({
    bindAddress: '127.0.0.1',
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
  })
  const history = ultralight.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const headerKey = getContentKey(HistoryNetworkContentType.BlockHeader, hexToBytes(hash))
  await history.store(headerKey, hexToBytes(headerWithProof.header))
  const stored = await history.get(headerKey)

  it('should store block header', () => {
    assert.equal(stored, headerWithProof.header)
  })
  it('should save block index', () => {
    const numberHex = '0x' + header.number.toString(16)
    assert.isTrue(history.blockHashIndex.has(numberHex))
    assert.equal(history.blockHashIndex.get(numberHex), hash)
  })
  it('should store blockIndex in DB', async () => {
    const expected = Array.from(history.blockHashIndex)
    const stored = JSON.parse(await ultralight.db.db.get('block_index'))
    assert.deepEqual(stored, expected)
  })

  const ultralight2 = await createPortalNetwork({
    bindAddress: '127.0.0.1',
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
    db: ultralight.db.db,
  })
  await ultralight2.start()
  const history2 = ultralight2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  it('should start with blockIndex in DB', async () => {
    const expected = history.blockHashIndex
    const stored = history2.blockHashIndex
    assert.deepEqual(stored, expected, `Expected ${expected.size} but got ${stored.size}`)
  })
})
