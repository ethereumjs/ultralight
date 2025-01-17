import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex, concatBytes, hexToBytes } from '@ethereumjs/util'
import { Common } from '@ethereumjs/common'
import { ssz, sszTypesFor } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'
import { BeaconLightClientNetworkContentType, BlockHeaderWithProof, getBeaconContentKey, getContentKey, HistoricalSummariesBlockProof, HistoricalSummariesKey, HistoricalSummariesWithProof, HistoryNetworkContentType, LightClientBootstrapKey, LightClientFinalityUpdateKey, LightClientOptimisticUpdateKey, slotToHistoricalBatchIndex } from 'portalnetwork'
import type { SingleProof } from '@chainsafe/persistent-merkle-tree'
import { computeEpochAtSlot, getChainForkConfigFromNetwork } from '@lodestar/light-client/utils'
import { mainnetChainConfig } from '@lodestar/config/configs'
import { readFileSync } from 'fs'
import { decompressBeaconBlock, getEraIndexes } from '../../era/src/helpers'
import { readEntry } from '../../era/src/helpers'
import { decompressBeaconState } from '../../era/src/helpers'
import { ForkName } from '@lodestar/params'
import { genesisData } from '@lodestar/config/networks'
import { createBeaconConfig } from '@lodestar/config'
import { executionPayloadFromBeaconPayload, BlockHeader } from '@ethereumjs/block'

const { Client } = jayson

const main = async () => {
    const forkConfig = getChainForkConfigFromNetwork('mainnet')
    const beaconConfig = mainnetChainConfig


    const beaconNode = 'https://lodestar-mainnet.chainsafe.io'
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

    // In order to be able to verify post-capella blocks, the light client embedded in 
    // the Beacon network needs to be initialized.  We fetch the latest finality update
    // from the Beacon node and use it's slot as a reference to the latest bootstrap 
    //and Historical Summaries
    const finalityUpdate = ssz.deneb.LightClientFinalityUpdate.fromJson(
        (await (await fetch(beaconNode + '/eth/v1/beacon/light_client/finality_update')).json()).data,
    )

    const optimisticUpdate = ssz.deneb.LightClientOptimisticUpdate.fromJson(
        (await (await fetch(beaconNode + '/eth/v1/beacon/light_client/optimistic_update')).json()).data,
    )
    console.log(
        `Retrieved latest optimistic update for slot ${BigInt(optimisticUpdate.signatureSlot)}`,
    )
    const optimisticUpdateKey = getBeaconContentKey(
        BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
        LightClientOptimisticUpdateKey.serialize({
            signatureSlot: BigInt(optimisticUpdate.signatureSlot),
        }),
    )

    const bootstrapSlot = finalityUpdate.finalizedHeader.beacon.slot
    const bootstrapRes = (
        await (await fetch(beaconNode + `/eth/v1/beacon/blocks/${bootstrapSlot}/root`)).json()
    )

    const bootstrapRoot = bootstrapRes.data.root
    const bootstrap = ssz.deneb.LightClientBootstrap.fromJson(
        (
            await (
                await fetch(beaconNode + `/eth/v1/beacon/light_client/bootstrap/${bootstrapRoot}`)
            ).json()
        ).data,
    )

    const forkName = forkConfig.getForkName(bootstrapSlot)
    const forkDigest = createBeaconConfig(beaconConfig, hexToBytes(genesisData.mainnet.genesisValidatorsRoot)).forkName2ForkDigest(forkName)
    console.log(
        `Retrieved bootstrap for finalized checkpoint ${bootstrapRoot}`,
    )

    // Push the bootstrap into the Portal Network
    let res = await ultralight.request('portal_beaconStore', [
        bytesToHex(getBeaconContentKey(
            BeaconLightClientNetworkContentType.LightClientBootstrap,
            LightClientBootstrapKey.serialize({ blockHash: hexToBytes(bootstrapRoot) }),
        )),
        bytesToHex(
            concatBytes(forkDigest, ssz[forkName].LightClientBootstrap.serialize(bootstrap)),
        ),
    ])
    console.log('Pushed bootstrap into Portal Network', res)

    // Star the light client using the bootstrap slot's block root
    res = await ultralight.request('portal_beaconStartLightClient', [
        bootstrapRoot
    ])
    console.log('Started Beacon Light Client Sync', res)

    // Push the latest optimistic update so the light client is synced (maybe not necessary)
    res = await ultralight.request('portal_beaconStore', [
        bytesToHex(optimisticUpdateKey),
        bytesToHex(
            concatBytes(
                forkDigest,
                ssz.deneb.LightClientOptimisticUpdate.serialize(optimisticUpdate),
            ),
        ),
    ])

    // Retrieve the historical summaries  at the bootstrap/finality update slot
    console.log('Retrieving latest historical summaries...')
    const res2 = await fetch(beaconNode + `/eth/v1/lodestar/historical_summaries/${finalityUpdate.finalizedHeader.beacon.slot}`)
    const res2Json = await res2.json()

    const historicalSummaries = ssz.deneb.BeaconState.fields.historicalSummaries.fromJson(res2Json.data.historical_summaries)
    const finalityEpoch = computeEpochAtSlot(finalityUpdate.finalizedHeader.beacon.slot)
    const proof = res2Json.data.proof.map((el) => hexToBytes(el))

    // Push the historical summaries into the Portal Network
    // Note - Ultralight should be able to verify the historical summaries using the proof from the Beacon node

    res = await ultralight.request('portal_beaconStore',
        [bytesToHex(getBeaconContentKey(BeaconLightClientNetworkContentType.HistoricalSummaries, HistoricalSummariesKey.serialize({ epoch: BigInt(finalityEpoch) }))),
        bytesToHex(concatBytes(forkDigest, HistoricalSummariesWithProof.serialize({ epoch: BigInt(finalityEpoch), historicalSummaries, proof })))])

    // Now we have a synced light client so should be able to verify post capella blocks (as long as they are not from the current sync period

    // In order to construct post Capella block proofs, we need to get the Historical Summary for the sync period we are serving
    // blocks from.  We can get these Historical Summaries from an era file for that sync period by reading the beacon state snapshot
    // pulling the `BlockRoots` from the `BeaconState` object.  The root of this object will match the `block_summary_root` index of 
    // the Historical Summaries object we retrieved from the Beacon node

    console.log(`Reading era file for period ${1320}`)
    const eraFile = new Uint8Array(readFileSync(`./scripts/eras/mainnet-01320-59f1c8c0.era`))
    const indices = getEraIndexes(eraFile)
    const stateEntry = readEntry(
        eraFile.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
    )
    const state = await decompressBeaconState(stateEntry.data, indices.stateSlotIndex.startSlot)
    const stateFork = forkConfig.getForkName(indices.stateSlotIndex.startSlot)

    // Now we can construct block proofs for any block in the sync period
    for (let x = 0; x < 1; x++) {
        try {

            // Read a Beacon Block from the era file
            const blockEntry = readEntry(eraFile.slice(indices.blockSlotIndex!.recordStart + indices.blockSlotIndex!.slotOffsets[x]))
            const block = await decompressBeaconBlock(blockEntry.data, indices.blockSlotIndex!.startSlot)
            const blockFork = ForkName.deneb
            // Retrieve the full Beacon Block object from the Beacon node since the era files don't contain
            // the Execution Payload
            const fullBlockJson = await (await fetch(beaconNode + `/eth/v2/beacon/blocks/${block.message.slot}`)).json()

            const fullBlock = sszTypesFor(blockFork).BeaconBlock.fromJson(fullBlockJson.data.message)

            // Build the Beacon Block Proof that anchors the EL block hash in the Beacon Block
            const elBlockHashPath = ssz[blockFork].BeaconBlock.getPathInfo([
                'body',
                'executionPayload',
                'blockHash',
            ])

            const beaconBlockProof = createProof(ssz[blockFork].BeaconBlock.toView(fullBlock).node, {
                gindex: elBlockHashPath.gindex,
                type: ProofType.single,
            }) as SingleProof

            // Build a proof that anchors the Beacon Block root in the Historical Summary for the sync period
            const batchIndex = Number(slotToHistoricalBatchIndex(BigInt(block.message.slot)))
            const historicalSummariesPath = ssz[stateFork].BeaconState.fields.blockRoots.getPathInfo([batchIndex])

            const blockRootsProof = createProof(ssz[stateFork].BeaconState.fields.blockRoots.toView(state.blockRoots).node, {
                gindex: historicalSummariesPath.gindex,
                type: ProofType.single,
            }) as SingleProof


            // Construct the aggregate proof 
            const blockProof = HistoricalSummariesBlockProof.fromJson({
                slot: block.message.slot,
                historicalSummariesProof: blockRootsProof.witnesses.map((witness) => bytesToHex(witness)),
                beaconBlockProof: beaconBlockProof.witnesses.map((witness) => bytesToHex(witness)),
                beaconBlockRoot: bytesToHex(ssz[blockFork].BeaconBlock.value_toTree(fullBlock).root),
            })

            // Hackery to allow us to construct an EL block header from the Beacon Block data
            const execPayload = executionPayloadFromBeaconPayload(fullBlockJson.data.message.body.execution_payload)
            execPayload['number'] = execPayload.blockNumber
            const header = BlockHeader.fromHeaderData(execPayload, { common: new Common({ chain: 'mainnet', hardfork: 'cancun' }) })
            const headerWithProof = BlockHeaderWithProof.serialize({
                header: header.serialize(),
                proof: {
                    value: blockProof,
                    selector: 3
                }
            })

            // Store the EL block header in the Portal Network
            res = await ultralight.request('portal_historyStore', [
                bytesToHex(getContentKey(HistoryNetworkContentType.BlockHeader, fullBlock.body.eth1Data.blockHash)),
                bytesToHex(headerWithProof)
            ])
            console.log(res)

            res = await ultralight.request('eth_getBlockByHash', [execPayload.blockHash, false])
            console.log('Retrieved block', execPayload.blockHash, res)

        } catch (err) {
            console.log(err)
        }

    }
}

main().catch((err) => {
    console.log('caught error', err)
    process.exit(0)
})
