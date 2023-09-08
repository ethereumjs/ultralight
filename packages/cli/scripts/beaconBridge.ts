import jayson from 'jayson/promise/index.js'

import { createBeaconConfig, defaultChainConfig, BeaconConfig } from '@lodestar/config'
import { genesisData } from '@lodestar/config/networks'
import { BeaconLightClientNetworkContentType, fromHexString, getBeaconContentKey, LightClientBootstrapKey, LightClientUpdatesByRange, LightClientUpdatesByRangeKey, ProtocolId, toHexString } from 'portalnetwork'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { capella, ssz } from '@lodestar/types'
import { EPOCHS_PER_SYNC_COMMITTEE_PERIOD, ForkName } from '@lodestar/params'
import { computeSyncPeriodAtSlot } from '@lodestar/light-client/utils'
import { concatBytes, hexToBytes } from '@ethereumjs/util'
import { serialize } from 'v8'

const { Client } = jayson
/*
const args: any = yargs(hideBin(process.argv))
    .option('blockHeight', {
        describe: 'block height to build accumulator to',
        number: true,
        default: 9000
    }).argv
*/
const main = async () => {
    const beaconConfig = createBeaconConfig(defaultChainConfig, hexToBytes(genesisData.mainnet.genesisValidatorsRoot))
    const capellaForkDigest = beaconConfig.forkName2ForkDigest(ForkName.capella)
    const beaconNode = 'https://lodestar-mainnet.chainsafe.io/'
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

    console.log('Retrieving bootstrap and updates from Beacon node...')
    const optimisticUpdate = ssz.capella.LightClientOptimisticUpdate.fromJson((await (await fetch(beaconNode + 'eth/v1/beacon/light_client/optimistic_update')).json()).data)
    const currentPeriod = computeSyncPeriodAtSlot(optimisticUpdate.signatureSlot)
    const oldPeriod = (currentPeriod - 6)
    const updatesByRange = (await (await fetch(beaconNode + `eth/v1/beacon/light_client/updates?start_period=${oldPeriod}&count=6`)).json())
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
    const rangeKey = getBeaconContentKey(BeaconLightClientNetworkContentType.LightClientUpdatesByRange, LightClientUpdatesByRangeKey.serialize({ startPeriod: BigInt(oldPeriod), count: 6n}))
    const bootstrapSlot = updatesByRange[0].data.finalized_header.beacon.slot
    const bootstrapRoot = (await (await fetch(beaconNode + `eth/v1/beacon/blocks/${bootstrapSlot}/root`)).json()).data.root
    const bootstrap = ssz.capella.LightClientBootstrap.fromJson((await (await fetch(beaconNode + `eth/v1/beacon/light_client/bootstrap/${bootstrapRoot}`)).json()).data)
    console.log(`Retrieved bootstrap for finalized checkpoint ${bootstrapRoot} from starting sync period ${oldPeriod}...`)
    const res = await ultralight.request('portal_beaconStore', [getBeaconContentKey(BeaconLightClientNetworkContentType.LightClientBootstrap, LightClientBootstrapKey.serialize({ blockHash: hexToBytes(bootstrapRoot) })), toHexString(concatBytes(capellaForkDigest, ssz.capella.LightClientBootstrap.serialize(bootstrap)))])
    console.log('Pushed bootstrap into Portal Network', res)
    const res2 = await ultralight.request('portal_beaconStore', [rangeKey, toHexString(serializedRange)])
    console.log(`Pushed light client updates for range ${oldPeriod}-${oldPeriod+6} into Portal Network`, res2)
}


main()