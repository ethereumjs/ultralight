import { distance } from '@chainsafe/discv5'
import { bytesToHex, randomBytes } from '@ethereumjs/util'
import debug from 'debug'
import { assert, describe, expect, it } from 'vitest'

import { NetworkId } from '../../src/index.js'
import { NetworkDB } from '../../src/networks/networkDB.js'

const nodeId = '80'.repeat(32)

const length = 20

const keyVals = Array.from({ length }, () => {
  return {
    key: randomBytes(33),
    value: randomBytes(1000),
  }
})

describe('networkdb', async () => {
  const historyDB = new NetworkDB({
    networkId: NetworkId.HistoryNetwork,
    nodeId,
    logger: debug('TEST'),
  })

  const size0 = await historyDB.size()
  it('should have size 0', () => {
    assert.equal(size0, 0)
  })

  for (const { key, value } of keyVals) {
    await historyDB.put(bytesToHex(key), bytesToHex(value))
  }
  let j = 0
  for await (const _ of historyDB.db.iterator()) {
    j++
  }
  it('should have put all', () => {
    expect(j).toEqual(length)
  })
  const r = 2n ** 255n - 1n
  let i = 0
  for await (const [key] of historyDB.db.keys()) {
    const d = distance(nodeId, historyDB.contentId(key))
    if (d > r) {
      i++
    }
  }
  const size1 = await historyDB.size()
  it('should have total size', () => {
    expect(size1).toBeGreaterThan(length * 1000)
  })
  await historyDB.prune(r)
  const size2 = await historyDB.size()
  it('should have pruned size', () => {
    expect(size2).toBeLessThan(size1)
  })
  let e = 0
  for await (const _ of historyDB.db.iterator()) {
    e++
  }
  it(`should have ${e} / ${length} remaining`, () => {
    expect(e).toEqual(length - i)
  })
})
