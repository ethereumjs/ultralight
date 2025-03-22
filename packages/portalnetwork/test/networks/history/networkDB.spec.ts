import { assert, describe, expect, it } from 'vitest'
import content from '../../testData/headersWithProofs.json'
import { HistoryNetwork, NetworkId, PortalNetwork } from '../../../src/index.js'
import { keys } from '@libp2p/crypto'
import { SignableENR } from '@chainsafe/enr'
import { hexToBytes } from '@ethereumjs/util'

const privateKey =
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130'

const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKey).slice(-36))
const enr = SignableENR.createFromPrivateKey(pk1)

describe('NetworkDB', async () => {
  const client = await PortalNetwork.create({
    config: {
      privateKey: pk1,
      enr,
    },
  })
  const history = new HistoryNetwork({
    client,
    networkId: NetworkId.HistoryNetwork,
  })
  for (const [k, v] of content) {
    await history.store(hexToBytes(k), hexToBytes(v))
  }
  const size = await history.db.size()
  it('should have the correct size', () => {
    assert.equal(size, 10572)
  })
  const newMaxStorage = 0.01
  it('should change prune and shrink radius', async () => {
    expect(size).toBeGreaterThan(newMaxStorage * 1000000)
    assert.isFalse(history.pruning)
    assert.equal(history.nodeRadius, 2n ** 256n - 1n)
    await history.prune(newMaxStorage)
    assert.equal(history.maxStorage, newMaxStorage)
    expect(history.nodeRadius).toBeLessThan(2n ** 256n - 1n)
    const size2 = await history.db.size()
    expect(size2).toBeLessThan(size)
    expect(size2).toBeLessThan(history.maxStorage * 1000000)
  })
})
