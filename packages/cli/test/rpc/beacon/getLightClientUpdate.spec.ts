import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { computeSyncPeriodAtSlot } from '@lodestar/light-client/utils'
import { ssz } from '@lodestar/types'
import {
  BeaconNetworkContentType,
  computeLightClientKeyFromPeriod,
  getBeaconContentKey,
} from 'portalnetwork'
import { afterAll, assert, beforeAll, describe, it } from 'vitest'

import { startRpc } from '../util.js'
const method = 'beacon_getLightClientUpdate'
describe(`${method} tests`, () => {
  let ultralight, rpc

  beforeAll(async () => {
    ;({ ultralight, rpc } = await startRpc({ networks: ['beacon'], rpcPort: 8548, port: 9003 }))
  })

  afterAll(() => {
    ultralight.kill(9)
  })

  it('should retrieve a light client update', async () => {
    const rangeJson = require('./range.json')[0]
    const rangeKey = getBeaconContentKey(
      BeaconNetworkContentType.LightClientUpdate,
      hexToBytes(
        computeLightClientKeyFromPeriod(
          computeSyncPeriodAtSlot(Number(rangeJson.data.attested_header.beacon.slot)),
        ),
      ),
    )
    const rangeHex = bytesToHex(
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(rangeJson.data),
      ),
    )
    await rpc.request('portal_beaconStore', [bytesToHex(rangeKey), rangeHex])

    const period =
      '0x' +
      computeSyncPeriodAtSlot(Number(BigInt(rangeJson.data.attested_header.beacon.slot))).toString(
        16,
      )
    const res = await rpc.request(method, [period])
    assert.equal(res.result.signature_slot, '7807053')
  }, 10000)
})
