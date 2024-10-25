import { bytesToHex, concatBytes, hexToBytes } from '@ethereumjs/util'
import { getClient } from '@lodestar/api'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import { genesisData } from '@lodestar/config/networks'
import { computeSyncPeriodAtSlot } from '@lodestar/light-client/utils'
import { ssz } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'
import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
  getBeaconContentKey,
} from 'portalnetwork'

import type { ForkLightClient } from '@lodestar/params'
import type { allForks } from '@lodestar/types'
import type { LightClientForkName } from 'portalnetwork'

const { Client } = jayson

const main = async () => {
  const beaconConfig = createBeaconConfig(
    defaultChainConfig,
    hexToBytes(genesisData.mainnet.genesisValidatorsRoot),
  )

  const beaconNode = 'https://lodestar-mainnet.chainsafe.io/'
  const ultralights: jayson.HttpClient[] = []
  for (let x = 0; x < 10; x++) {
    ultralights.push(Client.http({ host: '127.0.0.1', port: 8545 + x }))
  }

  const api = getClient({ baseUrl: beaconNode }, { config: beaconConfig })

  console.log('Retrieving bootstrap and updates from Beacon node...')
  const optimisticUpdate = (await api.lightclient.getOptimisticUpdate()).response!
  const optimisticUpdateKey = getBeaconContentKey(
    BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
    LightClientOptimisticUpdateKey.serialize({
      signatureSlot: BigInt(optimisticUpdate.data.attestedHeader.beacon.slot),
    }),
  )
  const currentPeriod = computeSyncPeriodAtSlot(optimisticUpdate!.data.signatureSlot)
  const oldPeriod = currentPeriod - 3
  const updatesByRange = await api.lightclient.getUpdates(oldPeriod, 4)

  const range: Uint8Array[] = []
  for (const update of updatesByRange.response!) {
    range.push(
      concatBytes(
        beaconConfig.forkName2ForkDigest(update.version as ForkLightClient),
        (
          ssz.allForksLightClient[
            update.version as LightClientForkName
          ] as allForks.AllForksLightClientSSZTypes
        ).LightClientUpdate.serialize(update.data),
      ),
    )
  }
  const serializedRange = LightClientUpdatesByRange.serialize(range)
  const rangeKey = getBeaconContentKey(
    BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
    LightClientUpdatesByRangeKey.serialize({ startPeriod: BigInt(oldPeriod), count: 4n }),
  )
  for (let x = 0; x < 4; x++) {
    const bootstrapSlot = updatesByRange.response![x].data.finalizedHeader.beacon.slot

    const bootstrapRoot = bytesToHex(
      (await api.beacon.getBlockRoot(bootstrapSlot)).response!.data.root,
    )
    const bootstrap = (await api.lightclient.getBootstrap(bootstrapRoot)).response!
    await ultralights[Math.floor(Math.random() * 10)].request('portal_beaconStore', [
      getBeaconContentKey(
        BeaconLightClientNetworkContentType.LightClientBootstrap,
        LightClientBootstrapKey.serialize({ blockHash: hexToBytes(bootstrapRoot) }),
      ),
      bytesToHex(
        concatBytes(
          beaconConfig.forkName2ForkDigest(bootstrap.version),
          (
            ssz.allForksLightClient[
              bootstrap.version as LightClientForkName
            ] as allForks.AllForksLightClientSSZTypes
          ).LightClientBootstrap.serialize(bootstrap.data),
        ),
      ),
    ])
    console.log(
      `Retrieved bootstrap for finalized checkpoint ${bootstrapRoot} from sync period ${
        oldPeriod + x
      } and seeding to network...`,
    )
  }

  for (let x = 0; x < 10; x++) {
    await ultralights[x].request('portal_beaconStore', [rangeKey, bytesToHex(serializedRange)])
  }
  console.log(
    `Seeded light client updates for range ${oldPeriod}-${oldPeriod + 4} into Portal Network`,
  )

  for (let x = 0; x < 10; x++) {
    const peerEnr = await ultralights[x].request('discv5_nodeInfo', [])
    if (x > 0) {
      for (let y = 0; y < x; y++) {
        const res = await ultralights[x - 1].request('portal_beaconAddBootNode', [
          peerEnr.result.enr,
        ])
        console.log(res)
      }
    }
  }
  const res3 = await ultralights[0].request('portal_beaconStore', [
    optimisticUpdateKey,
    bytesToHex(
      concatBytes(
        beaconConfig.forkName2ForkDigest(optimisticUpdate.version),
        (
          ssz.allForksLightClient[
            optimisticUpdate.version as LightClientForkName
          ] as allForks.AllForksLightClientSSZTypes
        ).LightClientOptimisticUpdate.serialize(optimisticUpdate.data),
      ),
    ),
  ])
  console.log(
    `Pushed optimistic update for signature slot ${optimisticUpdate.data.signatureSlot}`,
    res3,
  )

  process.on('SIGTERM', () => {
    console.log('Caught interrupt signal.  Shuttind down...')
    process.exit(0)
  })
  //eslint-disable-next-line
  while (true) {
    await new Promise((resolve) => setTimeout(() => resolve(undefined), 13000))
    const optimisticUpdate = (await api.lightclient.getOptimisticUpdate()).response!
    console.log('new update')
    const optimisticUpdateKey = getBeaconContentKey(
      BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
      LightClientOptimisticUpdateKey.serialize({
        signatureSlot: BigInt(optimisticUpdate.data.attestedHeader.beacon.slot),
      }),
    )
    const res = await ultralights[0].request('portal_beaconStore', [
      optimisticUpdateKey,
      bytesToHex(
        concatBytes(
          beaconConfig.forkName2ForkDigest(optimisticUpdate.version),
          (
            ssz.allForksLightClient[
              optimisticUpdate.version as LightClientForkName
            ] as allForks.AllForksLightClientSSZTypes
          ).LightClientOptimisticUpdate.serialize(optimisticUpdate.data),
        ),
      ),
    ])
    console.log(
      `Pushed optimistic update for signature slot ${optimisticUpdate.data.signatureSlot}`,
      res,
    )
  }
}

main().catch((err) => {
  console.log('caught error', err)
  process.exit(0)
})
