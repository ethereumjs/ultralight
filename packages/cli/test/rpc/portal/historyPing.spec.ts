import { assert, describe, it } from 'vitest'

import { startRpc } from '../util.js'
const method = 'portal_historyPing'
describe(`${method} tests`, () => {
  it('should get pong response', async () => {
    const { ultralight, rpc } = await startRpc({ networks: ['history'] })
    const { ultralight: ultralight2, rpc: rpc2 } = await startRpc({
      port: 9001,
      rpcPort: 8546,
      networks: ['history'],
    })
    const enr = (await rpc2.request('portal_historyNodeInfo', [])).result.enr

    const res = await rpc.request(method, [
      enr,
      0,
      JSON.stringify({ ClientInfo: 'ultralight', DataRadius: 1, Capabilities: [0] }),
    ])
    assert.equal(res.result, true)
    ultralight.kill()
    ultralight2.kill()
  }, 20000)
})
