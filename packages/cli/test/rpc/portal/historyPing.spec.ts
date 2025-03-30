import { afterAll, assert, beforeAll, describe, it } from 'vitest'

import { startRpc } from '../util.js'
const method = 'portal_historyPing'
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
  it('should get pong response', async () => {
    const enr = (await rp2.request('portal_historyNodeInfo', [])).result.enr
    assert.exists(enr)
    const res = await rp.request(method, [
      enr,
      0,
      { ClientInfo: 'ultralight', DataRadius: 1, Capabilities: [0] },
    ])
    assert.equal(res.result.payload.ClientInfo.clientName, 'ultralight')
  }, 20000)
  afterAll(() => {
    ul.kill()
    ul2.kill()
  })
})
