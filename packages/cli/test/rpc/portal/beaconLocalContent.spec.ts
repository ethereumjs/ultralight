import { bytesToHex } from '@ethereumjs/util'
import {
  BeaconNetworkContentType,
  LightClientOptimisticUpdateKey,
  getBeaconContentKey,
} from 'portalnetwork'
import { afterAll, assert, beforeAll, describe, it } from 'vitest'

import { startRpc } from '../util.js'
const method = 'portal_beaconLocalContent'
describe(`${method} tests`, () => {
  describe(`${method} tests`, () => {
    let ul
    let rp
    beforeAll(async () => {
      const { ultralight, rpc } = await startRpc({
        networks: ['beacon'],
        rpcPort: 8547,
        port: 9002,
      })
      ul = ultralight
      rp = rpc
    })
    it('should not find any local content', async () => {
      const key = LightClientOptimisticUpdateKey.serialize({ signatureSlot: 7807053n })
      const res = await rp.request(method, [
        bytesToHex(getBeaconContentKey(BeaconNetworkContentType.LightClientOptimisticUpdate, key)),
      ])
      console.log(res)
      assert.equal(res.error.code, -32009)
    }, 10000)
    afterAll(() => {
      ul.kill()
    })
  })
})
