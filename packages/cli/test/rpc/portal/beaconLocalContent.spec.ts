import { bytesToHex } from '@ethereumjs/util'
import {
  BeaconNetworkContentType,
  LightClientOptimisticUpdateKey,
  getBeaconContentKey,
} from 'portalnetwork'
import { assert, describe, it } from 'vitest'

import { startRpc } from '../util.js'
const method = 'portal_beaconLocalContent'
describe(`${method} tests`, () => {
  it('should not find any local content', async () => {
    const { ultralight, rpc } = await startRpc()
    const key = LightClientOptimisticUpdateKey.serialize({ signatureSlot: 7807053n })
    const res = await rpc.request(method, [
      bytesToHex(getBeaconContentKey(BeaconNetworkContentType.LightClientOptimisticUpdate, key)),
    ])
    assert.equal(res.error.code, -32009)
    ultralight.kill(9)
  }, 10000)
})
