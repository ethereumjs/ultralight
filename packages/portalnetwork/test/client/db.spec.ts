import { distance } from '@chainsafe/discv5'
import { bigIntToHex, hexToBytes, randomBytes } from '@ethereumjs/util'
import debug from 'debug'
import { assert, it } from 'vitest'

import {
  DBManager,
  HistoryNetworkContentType,
  NetworkId,
  getContentId,
  getContentKey,
  serializedContentKeyToContentId,
  toHexString,
} from '../../src/index.js'

it('DBManager unit tests', async () => {
  const size = async () => {
    return 500
  }
  const _self = randomBytes(32)
  const self = toHexString(_self)
  const log = debug('db test')
  const db = new DBManager(self.slice(2), log, size, [
    NetworkId.HistoryNetwork,
    NetworkId.StateNetwork,
  ])
  await db.open()
  const historyDb = db.sublevels.get(NetworkId.HistoryNetwork)!
  const utpNetwork = db.sublevels.get(NetworkId.UTPNetwork)
  assert.equal(db.db.status, 'open', 'Main database is open')
  assert.equal(historyDb.status, 'open', 'History Sublevel open')
  assert.equal(utpNetwork, undefined, 'Unsupported Network not open')
  assert.equal(db.nodeId, self.slice(2), 'db nodeId set correctly')

  const testHash = randomBytes(32)
  const testVal = randomBytes(48)
  const testKey = getContentKey(HistoryNetworkContentType.BlockHeader, testHash)
  const testId = getContentId(HistoryNetworkContentType.BlockHeader, toHexString(testHash))
  const _testId = serializedContentKeyToContentId(hexToBytes(testKey))
  assert.equal(_testId, testId, 'testIds match')

  db.put(NetworkId.HistoryNetwork, testKey, toHexString(testVal))
  const lookupD = BigInt.asUintN(32, distance(self.slice(2), testId.slice(2)))
  const lookupKey = bigIntToHex(lookupD)

  const historyPrefix = '!0x500b!'
  const key0 = [...(await db.db.keys().all())][0]
  assert.equal(
    key0,
    historyPrefix + lookupKey,
    'DBManager prefixed HistoryNetwork key with HistoryNetwork prefix',
  )
  assert.equal(
    BigInt.asUintN(32, BigInt(self)) ^ BigInt.asUintN(32, BigInt(testId)),
    BigInt.asUintN(32, lookupD),
    'XOR formula works',
  )
  assert.equal(
    BigInt.asUintN(32, lookupD) ^ BigInt.asUintN(32, BigInt(testId)),
    BigInt.asUintN(32, BigInt(self)),
    'XOR formula works',
  )
  assert.equal(
    BigInt.asUintN(32, BigInt(self)) ^ BigInt.asUintN(32, lookupD),
    BigInt.asUintN(32, BigInt(testId)),
    'XOR formula works',
  )
  const val = await historyDb.get(lookupKey)
  assert.equal(
    val,
    toHexString(testVal),
    'HistoryNetwork content retrieved directly from history sublevel',
  )
  const res = await db.get(NetworkId.HistoryNetwork, testKey)
  assert.equal(res, toHexString(testVal), 'DBManager retrieved History Content from a content key')

  for (let i = 0; i < 10000; i++) {
    let testKey = toHexString(randomBytes(33))
    while (parseInt(testKey[3]) < 6) {
      testKey = toHexString(randomBytes(33))
    }
    const testVal = randomBytes(48)
    db.put(NetworkId.StateNetwork, testKey, toHexString(testVal))
  }
  for (let i = 0; i < 9999; i++) {
    const testHash = randomBytes(32)
    const testKey = getContentKey(HistoryNetworkContentType.BlockHeader, testHash)
    const testVal = randomBytes(48)
    db.put(NetworkId.HistoryNetwork, testKey, toHexString(testVal))
  }

  assert.equal((await db.db.keys().all()).length, 20000, '20000 total keys')
  assert.equal((await historyDb.keys().all())?.length, 10000, '10000 history sublevel keys')

  const oldRadius = 2n ** 256n
  const newRadius = oldRadius / 2n
  for await (const key of historyDb!.keys({ gte: bigIntToHex(newRadius) })) {
    historyDb!.del(key)
  }
  const rest = (await historyDb?.keys().all())!.length
  assert.ok(
    rest < 10000,
    `pruning by 50% removed ${((10000 - rest) * 100) / 10000}% of sublevel content`,
  )
  assert.equal((await db.db.keys().all()).length, 10000 + rest, 'Keys deleted only from sublevel')
  db.close()
})
