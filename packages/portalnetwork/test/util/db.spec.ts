import { distance } from '@chainsafe/discv5'
import { hexToBytes, randomBytes } from '@ethereumjs/util'
import debug from 'debug'
import { assert, describe, expect, it } from 'vitest'

import { NetworkId } from '../../src/index.js'
import { NetworkDB } from '../../src/networks/networkDB.js'

const nodeId = '80'.repeat(32)

const length = 20

const keyVals: {
  key: Uint8Array
  value: Uint8Array
}[] = Array.from({ length }, () => {
  return {
    key: randomBytes(33),
    value: randomBytes(1000),
  }
})

describe('networkdb', () => {
  const historyDB = new NetworkDB({
    networkId: NetworkId.HistoryNetwork,
    nodeId,
    logger: debug('TEST'),
  })

  it('should have size 0', async () => {
    const size0 = await historyDB.size()
    assert.equal(size0, 0)
  })

  it('should correctly put/prune', async () => {
    for (const { key, value } of keyVals) {
      await historyDB.put(key, value)
    }
    let j = 0
    for await (const _ of historyDB.db.iterator()) {
      j++
    }
    expect(j).toEqual(length) // should have put all values

    const r = 2n ** 255n - 1n
    let i = 0
    for await (const key of historyDB.db.keys()) {
      const d = distance(nodeId, historyDB.contentId(hexToBytes(key)))
      if (d > r) {
        i++
      }
    }

    const size1 = await historyDB.size()
    expect(size1).toBeGreaterThan(length * 1000) // should have a total size greater than `length`

    await historyDB.prune(r)
    const size2 = await historyDB.size()

    expect(size2).toBeLessThan(size1) // expect DB to prune values outside of radius

    let e = 0
    for await (const _ of historyDB.db.iterator()) {
      e++
    }

    expect(e).toEqual(length - i) // expect remaining values to be <= radius
  })
})
