import { computeSyncPeriodAtSlot } from '@lodestar/light-client/utils'
import { ssz } from '@lodestar/types'
import {
  BeaconLightClientNetworkContentType,
  computeLightClientKeyFromPeriod,
  fromHexString,
  getBeaconContentKey,
  toHexString,
} from 'portalnetwork'
import { assert, describe, it } from 'vitest'

import { startRpc } from '../util.js'
const method = 'beacon_getLightClientUpdate'
describe(`${method} tests`, () => {
  it('should retrieve a light client update', async () => {
    const { ultralight, rpc } = await startRpc()
    const rangeJson = require('./range.json')[0]
    const rangeKey = getBeaconContentKey(
      BeaconLightClientNetworkContentType.LightClientUpdate,
      fromHexString(
        computeLightClientKeyFromPeriod(
          computeSyncPeriodAtSlot(Number(rangeJson.data.attested_header.beacon.slot)),
        ),
      ),
    )
    const rangeHex = toHexString(
      ssz.allForksLightClient.capella.LightClientUpdate.serialize(
        ssz.allForksLightClient.capella.LightClientUpdate.fromJson(rangeJson.data),
      ),
    )
    await rpc.request('portal_beaconStore', [rangeKey, rangeHex])

    const period =
      '0x' +
      computeSyncPeriodAtSlot(Number(BigInt(rangeJson.data.attested_header.beacon.slot))).toString(
        '16',
      )

    const res = await rpc.request('beacon_getLightClientUpdate', [period])
    console.log(res)
    ultralight.kill(9)
  }, 20000)
})
