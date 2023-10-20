import jayson from 'jayson/promise/index.js'

import { createBeaconConfig, defaultChainConfig, BeaconConfig } from '@lodestar/config'
import { genesisData } from '@lodestar/config/networks'
import { BeaconLightClientNetworkContentType, fromHexString, getBeaconContentKey, LightClientBootstrapKey, LightClientFinalityUpdateKey, LightClientOptimisticUpdateKey, LightClientUpdatesByRange, LightClientUpdatesByRangeKey, ProtocolId, toHexString } from 'portalnetwork'
import { ssz } from '@lodestar/types'
import { ForkName } from '@lodestar/params'
import { computeSyncPeriodAtSlot } from '@lodestar/light-client/utils'
import { concatBytes, hexToBytes } from '@ethereumjs/util'


const { Client } = jayson

const main = async () => {
    const beaconConfig = createBeaconConfig(defaultChainConfig, hexToBytes(genesisData.mainnet.genesisValidatorsRoot))
    const capellaForkDigest = beaconConfig.forkName2ForkDigest(ForkName.capella)
    const beaconNode = 'https://lodestar-mainnet.chainsafe.io/'
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

    console.log('Retrieving bootstrap and updates from Beacon node...')
    let optimisticUpdate = ssz.capella.LightClientOptimisticUpdate.fromJson((await (await fetch(beaconNode + 'eth/v1/beacon/light_client/optimistic_update')).json()).data) 
    console.log(`Retrieved latest optimistic update for slot ${BigInt(optimisticUpdate.signatureSlot)}`)
    let optimisticUpdateKey = getBeaconContentKey(BeaconLightClientNetworkContentType.LightClientOptimisticUpdate, LightClientOptimisticUpdateKey.serialize({ signatureSlot: BigInt(optimisticUpdate.signatureSlot) }))
    const currentPeriod = computeSyncPeriodAtSlot(optimisticUpdate.signatureSlot)
    const oldPeriod = (currentPeriod - 2)
    const updatesByRange = (await (await fetch(beaconNode + `eth/v1/beacon/light_client/updates?start_period=${oldPeriod}&count=3`)).json())
    const range: Uint8Array[] = []
    for (const update of updatesByRange) {
        range.push(concatBytes(
            capellaForkDigest,
            ssz.capella.LightClientUpdate.serialize(
                ssz.capella.LightClientUpdate.fromJson(update.data),
            ),
        ))
    }
    const serializedRange = LightClientUpdatesByRange.serialize(range)
    const rangeKey = getBeaconContentKey(BeaconLightClientNetworkContentType.LightClientUpdatesByRange, LightClientUpdatesByRangeKey.serialize({ startPeriod: BigInt(oldPeriod), count: 3n }))
    const bootstrapSlot = updatesByRange[0].data.finalized_header.beacon.slot
    const bootstrapRoot = (await (await fetch(beaconNode + `eth/v1/beacon/blocks/${bootstrapSlot}/root`)).json()).data.root
    const bootstrap = ssz.capella.LightClientBootstrap.fromJson((await (await fetch(beaconNode + `eth/v1/beacon/light_client/bootstrap/${bootstrapRoot}`)).json()).data)
    console.log(`Retrieved bootstrap for finalized checkpoint ${bootstrapRoot} from starting sync period ${oldPeriod}...`)
    const res = await ultralight.request('portal_beaconStore', [getBeaconContentKey(BeaconLightClientNetworkContentType.LightClientBootstrap, LightClientBootstrapKey.serialize({ blockHash: hexToBytes(bootstrapRoot) })), toHexString(concatBytes(capellaForkDigest, ssz.capella.LightClientBootstrap.serialize(bootstrap)))])
    console.log('Pushed bootstrap into Portal Network', res)
    const res2 = await ultralight.request('portal_beaconStore', [rangeKey, toHexString(serializedRange)])
    console.log(`Pushed light client updates for range ${oldPeriod}-${currentPeriod} into Portal Network`, res2)
    const res3 = await ultralight.request('portal_beaconStore', [optimisticUpdateKey, toHexString(concatBytes(capellaForkDigest, ssz.capella.LightClientOptimisticUpdate.serialize(optimisticUpdate)))])
    console.log(`Pushed optimistic update for signature slot ${optimisticUpdate.signatureSlot}`, res3)
    const res4 = await ultralight.request('portal_beaconStartLightClient',[bootstrapRoot])
    console.log(`Starting light client sync with bootstrap ${bootstrapRoot}`)
    process.on('SIGTERM', () => {
        console.log('Caught interrupt signal.  Shutting down...')
        process.exit(0)
    })
    process.on('SIGINT', () => {
        console.log('Caught interrupt signal.  Shutting down...')
        process.exit(0)
    })
    while (true) {
        await new Promise(resolve => setTimeout(() => resolve(undefined), 13000))
        let optimisticUpdate = ssz.capella.LightClientOptimisticUpdate.fromJson((await (await fetch(beaconNode + 'eth/v1/beacon/light_client/optimistic_update')).json()).data)
        let optimisticUpdateKey = getBeaconContentKey(BeaconLightClientNetworkContentType.LightClientOptimisticUpdate, LightClientOptimisticUpdateKey.serialize({ signatureSlot: BigInt(optimisticUpdate.signatureSlot) }))
        let res = await ultralight.request('portal_beaconStore', [optimisticUpdateKey, toHexString(concatBytes(capellaForkDigest, ssz.capella.LightClientOptimisticUpdate.serialize(optimisticUpdate)))])
        console.log(`Pushed optimistic update for signature slot ${optimisticUpdate.signatureSlot}`, res)
        let finalityUpdate = ssz.capella.LightClientFinalityUpdate.fromJson((await (await fetch(beaconNode + 'eth/v1/beacon/light_client/finality_update')).json()).data) 
        let finalityUpdateKey = getBeaconContentKey(BeaconLightClientNetworkContentType.LightClientFinalityUpdate, LightClientFinalityUpdateKey.serialize({ finalitySlot: BigInt(finalityUpdate.finalizedHeader.beacon.slot) }))
        res = await ultralight.request('portal_beaconStore', [finalityUpdateKey, toHexString(concatBytes(capellaForkDigest, ssz.capella.LightClientFinalityUpdate.serialize(finalityUpdate)))])
        console.log(`Pushed finality update for signature slot ${finalityUpdate.finalizedHeader.beacon.slot}`, res)
    }

}

main().catch(err => {
    console.log('caught error', err)
    process.exit(0)
})