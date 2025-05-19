import { assert, afterAll, beforeAll, describe, it } from 'vitest'

import { startRpc } from '../util.js'
const method = 'eth_chainId'
describe(`${method} tests`, () => {
    describe(`${method} tests`, () => {
        let ul
        let rp
        beforeAll(async () => {
            const { ultralight, rpc } = await startRpc({
                networks: ['history'],
                rpcPort: 8547,
                port: 9002,
            })
            ul = ultralight
            rp = rpc
        })
        it('should return the correct chainId', async () => {
            const res = await rp.request(method, [])
            assert.equal(res.result, '0x1')
        })
        afterAll(() => {
            ul.kill()
        })
    })
})
