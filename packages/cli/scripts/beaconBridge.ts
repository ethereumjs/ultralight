import { writeFileSync } from 'fs'
import { bytesToHex, concatBytes, hexToBytes } from '@ethereumjs/util'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import { genesisData } from '@lodestar/config/networks'
import { computeSyncPeriodAtSlot } from '@lodestar/light-client/utils'
import { ForkName } from '@lodestar/params'
import { ssz } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'
import {
  BeaconNetworkContentType,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
  getBeaconContentKey,
} from 'portalnetwork'

const { Client } = jayson

const main = async () => {
  const beaconConfig = createBeaconConfig(
    defaultChainConfig,
    hexToBytes(genesisData.mainnet.genesisValidatorsRoot),
  )
  const capellaForkDigest = beaconConfig.forkName2ForkDigest(ForkName.capella)
  const beaconNode = 'http://testing.mainnet.beacon-api.nimbus.team/'
  const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

  console.log('Retrieving bootstrap and updates from Beacon node...')
  const optimisticUpdate = ssz.capella.LightClientOptimisticUpdate.fromJson(
    (await (await fetch(beaconNode + 'eth/v1/beacon/light_client/optimistic_update')).json()).data,
  )
  console.log(
    `Retrieved latest optimistic update for slot ${BigInt(optimisticUpdate.signatureSlot)}`,
  )
  const optimisticUpdateKey = getBeaconContentKey(
    BeaconNetworkContentType.LightClientOptimisticUpdate,
    LightClientOptimisticUpdateKey.serialize({
      signatureSlot: BigInt(optimisticUpdate.signatureSlot),
    }),
  )
  const currentPeriod = computeSyncPeriodAtSlot(optimisticUpdate.signatureSlot)
  const oldPeriod = currentPeriod - 2
  const updatesByRange = await (
    await fetch(beaconNode + `eth/v1/beacon/light_client/updates?start_period=${oldPeriod}&count=3`)
  ).json()
  writeFileSync('range.json', JSON.stringify(updatesByRange))
  const range: Uint8Array[] = []
  for (const update of updatesByRange) {
    range.push(
      concatBytes(
        capellaForkDigest,
        ssz.capella.LightClientUpdate.serialize(
          ssz.capella.LightClientUpdate.fromJson(update.data),
        ),
      ),
    )
  }
  const serializedRange = LightClientUpdatesByRange.serialize(range)
  const rangeKey = getBeaconContentKey(
    BeaconNetworkContentType.LightClientUpdatesByRange,
    LightClientUpdatesByRangeKey.serialize({ startPeriod: BigInt(oldPeriod), count: 3n }),
  )
  const bootstrapSlot = updatesByRange[0].data.finalized_header.beacon.slot
  const bootstrapRoot = (
    await (await fetch(beaconNode + `eth/v1/beacon/blocks/${bootstrapSlot}/root`)).json()
  ).data.root
  const bootstrap = ssz.capella.LightClientBootstrap.fromJson(
    (
      await (
        await fetch(beaconNode + `eth/v1/beacon/light_client/bootstrap/${bootstrapRoot}`)
      ).json()
    ).data,
  )
  console.log(
    `Retrieved bootstrap for finalized checkpoint ${bootstrapRoot} from starting sync period ${oldPeriod}...`,
  )
  const res = await ultralight.request('portal_beaconStore', [
    getBeaconContentKey(
      BeaconNetworkContentType.LightClientBootstrap,
      LightClientBootstrapKey.serialize({ blockHash: hexToBytes(bootstrapRoot) }),
    ),
    bytesToHex(
      concatBytes(capellaForkDigest, ssz.capella.LightClientBootstrap.serialize(bootstrap)),
    ),
  ])
  console.log('Pushed bootstrap into Portal Network', res)
  const res2 = await ultralight.request('portal_beaconStore', [
    rangeKey,
    bytesToHex(serializedRange),
  ])
  console.log(
    `Pushed light client updates for range ${oldPeriod}-${currentPeriod} into Portal Network`,
    res2,
  )
  const res3 = await ultralight.request('portal_beaconStore', [
    optimisticUpdateKey,
    bytesToHex(
      concatBytes(
        capellaForkDigest,
        ssz.capella.LightClientOptimisticUpdate.serialize(optimisticUpdate),
      ),
    ),
  ])
  console.log(`Pushed optimistic update for signature slot ${optimisticUpdate.signatureSlot}`, res3)
  await ultralight.request('portal_beaconStartLightClient', [bootstrapRoot])
  console.log(`Starting light client sync with bootstrap ${bootstrapRoot}`)
  process.on('SIGTERM', () => {
    console.log('Caught interrupt signal.  Shutting down...')
    process.exit(0)
  })
  process.on('SIGINT', () => {
    console.log('Caught interrupt signal.  Shutting down...')
    process.exit(0)
  })
  //eslint-disable-next-line
  while (true) {
    await new Promise((resolve) => setTimeout(() => resolve(undefined), 13000))
    const optimisticUpdate = ssz.capella.LightClientOptimisticUpdate.fromJson(
      (await (await fetch(beaconNode + 'eth/v1/beacon/light_client/optimistic_update')).json())
        .data,
    )
    const optimisticUpdateKey = getBeaconContentKey(
      BeaconNetworkContentType.LightClientOptimisticUpdate,
      LightClientOptimisticUpdateKey.serialize({
        signatureSlot: BigInt(optimisticUpdate.signatureSlot),
      }),
    )
    let res = await ultralight.request('portal_beaconStore', [
      optimisticUpdateKey,
      bytesToHex(
        concatBytes(
          capellaForkDigest,
          ssz.capella.LightClientOptimisticUpdate.serialize(optimisticUpdate),
        ),
      ),
    ])
    console.log(
      `Pushed optimistic update for signature slot ${optimisticUpdate.signatureSlot}`,
      res,
    )
    const finalityUpdate = ssz.capella.LightClientFinalityUpdate.fromJson(
      (await (await fetch(beaconNode + 'eth/v1/beacon/light_client/finality_update')).json()).data,
    )
    const finalityUpdateKey = getBeaconContentKey(
      BeaconNetworkContentType.LightClientFinalityUpdate,
      LightClientFinalityUpdateKey.serialize({
        finalitySlot: BigInt(finalityUpdate.finalizedHeader.beacon.slot),
      }),
    )
    res = await ultralight.request('portal_beaconStore', [
      finalityUpdateKey,
      bytesToHex(
        concatBytes(
          capellaForkDigest,
          ssz.capella.LightClientFinalityUpdate.serialize(finalityUpdate),
        ),
      ),
    ])
    console.log(
      `Pushed finality update for signature slot ${finalityUpdate.finalizedHeader.beacon.slot}`,
      res,
    )
  }
}

main().catch((err) => {
  console.log('caught error', err)
  process.exit(0)
})
