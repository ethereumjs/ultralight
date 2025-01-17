import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex, concatBytes, equalsBytes, hexToBytes } from '@ethereumjs/util'
import { Common } from '@ethereumjs/common'
import { ssz, sszTypesFor } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'
import { BeaconLightClientNetworkContentType, blockFromRpc, blockHeaderFromRpc, BlockHeaderWithProof, getBeaconContentKey, getContentKey, HistoricalRootsBlockProof, HistoricalSummariesBlockProof, HistoricalSummariesKey, HistoricalSummariesWithProof, HistoryNetworkContentType, LightClientBootstrapKey, LightClientFinalityUpdateKey, LightClientOptimisticUpdateKey, slotToHistoricalBatchIndex } from 'portalnetwork'
import type { SingleProof } from '@chainsafe/persistent-merkle-tree'
import { computeEpochAtSlot, getChainForkConfigFromNetwork, getCurrentSlot } from '@lodestar/light-client/utils'
import { mainnetChainConfig } from '@lodestar/config/configs'
import { readFileSync } from 'fs'
import { decompressBeaconBlock, getEraIndexes } from '../../era/src/helpers'
import { readEntry } from '../../era/src/helpers'
import { decompressBeaconState } from '../../era/src/helpers'
import { ForkName } from '@lodestar/params'
import { genesisData } from '@lodestar/config/networks'
import { createBeaconConfig } from '@lodestar/config'
import { executionPayloadFromBeaconPayload, BlockHeader, Block } from '@ethereumjs/block'

const { Client } = jayson

const main = async () => {
    const forkConfig = getChainForkConfigFromNetwork('mainnet')
    const beaconConfig = mainnetChainConfig


    const beaconNode = 'https://lodestar-mainnet.chainsafe.io'
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

    const finalityUpdate = ssz.capella.LightClientFinalityUpdate.fromJson(
        (await (await fetch(beaconNode + '/eth/v1/beacon/light_client/finality_update')).json()).data,
    )
    const finalityUpdateKey = getBeaconContentKey(
        BeaconLightClientNetworkContentType.LightClientFinalityUpdate,
        LightClientFinalityUpdateKey.serialize({
            finalitySlot: BigInt(finalityUpdate.finalizedHeader.beacon.slot),
        }),
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

    res = await ultralight.request('portal_beaconStartLightClient', [
        bootstrapRoot
    ])
    console.log('Started Beacon Light Client Sync', res)

    res = await ultralight.request('portal_beaconStore', [
        bytesToHex(optimisticUpdateKey),
        bytesToHex(
            concatBytes(
                forkDigest,
                ssz.deneb.LightClientOptimisticUpdate.serialize(optimisticUpdate),
            ),
        ),
    ])

    console.log('Retrieving latest historical summaries...')
    const res2 = await fetch(beaconNode + `/eth/v1/lodestar/historical_summaries/${finalityUpdate.finalizedHeader.beacon.slot}`)
    const res2Json = await res2.json()
    console.log(res2Json)
    const historicalSummaries = ssz.deneb.BeaconState.fields.historicalSummaries.fromJson(res2Json.data.historical_summaries)
    const finalityEpoch = computeEpochAtSlot(finalityUpdate.finalizedHeader.beacon.slot)
    const proof = res2Json.data.proof.map((el) => hexToBytes(el))

    res = await ultralight.request('portal_beaconStore',
        [bytesToHex(getBeaconContentKey(BeaconLightClientNetworkContentType.HistoricalSummaries, HistoricalSummariesKey.serialize({ epoch: BigInt(finalityEpoch) }))),
        bytesToHex(concatBytes(forkDigest, HistoricalSummariesWithProof.serialize({ epoch: BigInt(finalityEpoch), historicalSummaries, proof })))])
    console.log(`Reading era file for period ${1320}`)
    const eraFile = new Uint8Array(readFileSync(`./scripts/eras/mainnet-01320-59f1c8c0.era`))
    const indices = getEraIndexes(eraFile)
    const stateEntry = readEntry(
        eraFile.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
    )
    const state = await decompressBeaconState(stateEntry.data, indices.stateSlotIndex.startSlot)
    const stateFork = forkConfig.getForkName(indices.stateSlotIndex.startSlot)
    for (let x = 0; x < 1; x++) {
        try {
            const blockEntry = readEntry(eraFile.slice(indices.blockSlotIndex!.recordStart + indices.blockSlotIndex!.slotOffsets[x]))
            const block = await decompressBeaconBlock(blockEntry.data, indices.blockSlotIndex!.startSlot)
            const blockFork = ForkName.deneb
            const fullBlockJson = await (await fetch(beaconNode + `/eth/v2/beacon/blocks/${block.message.slot}`)).json()

            const fullBlock = sszTypesFor(blockFork).BeaconBlock.fromJson(fullBlockJson.data.message)

            const elBlockHashPath = ssz[blockFork].BeaconBlock.getPathInfo([
                'body',
                'executionPayload',
                'blockHash',
            ])

            const beaconBlockProof = createProof(ssz[blockFork].BeaconBlock.toView(fullBlock).node, {
                gindex: elBlockHashPath.gindex,
                type: ProofType.single,
            }) as SingleProof

            const batchIndex = Number(slotToHistoricalBatchIndex(BigInt(block.message.slot)))
            const historicalSummariesPath = ssz[stateFork].BeaconState.fields.blockRoots.getPathInfo([batchIndex])

            const blockRootsProof = createProof(ssz[stateFork].BeaconState.fields.blockRoots.toView(state.blockRoots).node, {
                gindex: historicalSummariesPath.gindex,
                type: ProofType.single,
            }) as SingleProof

            const blockProof = HistoricalSummariesBlockProof.fromJson({
                slot: block.message.slot,
                historicalSummariesProof: blockRootsProof.witnesses.map((witness) => bytesToHex(witness)),
                beaconBlockProof: beaconBlockProof.witnesses.map((witness) => bytesToHex(witness)),
                beaconBlockRoot: bytesToHex(ssz[blockFork].BeaconBlock.value_toTree(fullBlock).root),
            })
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
            res = await ultralight.request('portal_historyStore', [
                bytesToHex(getContentKey(HistoryNetworkContentType.BlockHeader, fullBlock.body.eth1Data.blockHash)),
                bytesToHex(headerWithProof)
            ])
            console.log(res)

        } catch (err) {
            console.log(err)
        }

    }
}

main().catch((err) => {
    console.log('caught error', err)
    process.exit(0)
})
