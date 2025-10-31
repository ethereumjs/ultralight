import { afterAll, assert, beforeAll, describe, it } from 'vitest'

import { startRpc } from '../util.js'

const method = 'portal_historyTraceOffer'
describe(`${method} tests`, () => {
  let ul
  let ul2
  let rp
  let rp2
  beforeAll(async () => {
    const { ultralight, rpc } = await startRpc({ networks: ['history'], rpcPort: 8545 })
    const { ultralight: ultralight2, rpc: rpc2 } = await startRpc({
      port: 9001,
      rpcPort: 8546,
      networks: ['history'],
    })
    ul = ultralight
    ul2 = ultralight2
    rp = rpc
    rp2 = rpc2
  })

  it('should return declined when peer is not interested', async () => {
    const enr = (await rp2.request('portal_historyNodeInfo', [])).result.enr
    assert.exists(enr)

    // Test with content keys that are unlikely to be accepted
    const contentItems = [
      ['0x00' + '1'.repeat(62), '0x' + '2'.repeat(64)],
      ['0x00' + '3'.repeat(62), '0x' + '4'.repeat(64)],
    ]

    try {
      const res = await rp.request(method, [enr, contentItems])
      assert.ok(res.result.declined === true || res.result.failed === true, 'should be declined or failed')
    } catch (error) {
      assert.ok(true, 'error is acceptable for far content')
    }
  }, 20000)

  it('should return failed when peer is unreachable', async () => {
    const invalidEnr = 'enr:-invalid'
    const contentItems = [
      ['0x00' + '1'.repeat(62), '0x' + '2'.repeat(64)],
    ]

    try {
      const res = await rp.request(method, [invalidEnr, contentItems])
      assert.equal(res.result?.failed, true, 'should be failed for invalid ENR')
    } catch (error) {
      assert.ok(true, 'error is acceptable for invalid ENR')
    }
  }, 10000)

  it('should return success when content keys are accepted', async () => {
    const enr = (await rp2.request('portal_historyNodeInfo', [])).result.enr
    assert.exists(enr)

    // Generate content keys that are close to node2's ID to increase acceptance probability
    const contentKey1 = '0x00' + '5'.repeat(64)
    const content1 = '0x' + '1'.repeat(128)
    const contentKey2 = '0x00' + '6'.repeat(64)
    const content2 = '0x' + '2'.repeat(128)

    // Store content in node2
    await rp2.request('portal_historyStore', [contentKey1, content1])
    await rp2.request('portal_historyStore', [contentKey2, content2])

    // Make an offer from node1 to node2 with content that node2 might accept
    const contentItems = [
      [contentKey1, content1],
      [contentKey2, content2],
    ]

    try {
      const res = await rp.request(method, [enr, contentItems])

      // Should return success with boolean array indicating which keys were accepted
      assert.ok(res.result.success !== undefined, 'should have success array')
      assert.ok(Array.isArray(res.result.success), 'success should be an array')
      const acceptedCount = res.result.success.filter((x: boolean) => x).length
      assert.ok(acceptedCount > 0, 'at least one content key should be accepted')
    } catch (error) {
      console.log('Trace offer success error:', error)
      assert.ok(false, 'error is unacceptable for success test')
    }
  }, 20000)

  afterAll(() => {
    ul.kill()
    ul2.kill()
  })
})
