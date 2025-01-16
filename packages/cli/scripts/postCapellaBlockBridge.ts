import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex, equalsBytes } from '@ethereumjs/util'
import { ssz, sszTypesFor } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'
import { HistoricalRootsBlockProof, HistoricalSummariesBlockProof, slotToHistoricalBatchIndex } from 'portalnetwork'
import type { SingleProof } from '@chainsafe/persistent-merkle-tree'
import { computeEpochAtSlot, getChainForkConfigFromNetwork, getCurrentSlot } from '@lodestar/light-client/utils'
import { mainnetChainConfig } from '@lodestar/config/configs'
import { readFileSync } from 'fs'
import { decompressBeaconBlock, getEraIndexes } from '../../era/src/helpers'
import { readEntry } from '../../era/src/helpers'
import { decompressBeaconState } from '../../era/src/helpers'

const { Client } = jayson

const main = async () => {
    const forkConfig = getChainForkConfigFromNetwork('mainnet')
    const beaconConfig = mainnetChainConfig
    const beaconNode = 'https://lodestar-mainnet.chainsafe.io'
    const _ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

    const currentSlot = getCurrentSlot(beaconConfig, 1606824000)
    const currentEpoch = computeEpochAtSlot(Number(currentSlot))
    console.log('Current Epoch: ', currentEpoch)

    const pastEpochEndSlot = (currentEpoch * 32) - 1
    console.log('Past Epoch End Slot: ', pastEpochEndSlot)
    console.log('Retrieving latest historical summaries...')
    // const res2 = await fetch(beaconNode + `/eth/v1/lodestar/historical_summaries/${pastEpochEndSlot}`)
    // const res2Json = await res2.json()
    // console.log(res2Json)
    // const historicalSummaries = ssz.capella.BeaconState.fields.historicalSummaries.fromJson(res2Json.data.historical_summaries)

    console.log(`Reading era file for period ${1320}`)
    const eraFile = new Uint8Array(readFileSync(`./scripts/eras/mainnet-01320-59f1c8c0.era`))
    const indices = getEraIndexes(eraFile)
    const stateEntry = readEntry(
        eraFile.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
    )
    const state = await decompressBeaconState(stateEntry.data, indices.stateSlotIndex.startSlot)
    const stateFork = forkConfig.getForkName(indices.stateSlotIndex.startSlot)
    const blockRootsRoot = ssz[stateFork].BeaconState.fields.blockRoots.toView(state.blockRoots).node
    for (let x = 0; x < 1; x++) {
        try {
            const blockEntry = readEntry(eraFile.slice(indices.blockSlotIndex!.recordStart + indices.blockSlotIndex!.slotOffsets[x]))
            const block = await decompressBeaconBlock(blockEntry.data, indices.blockSlotIndex!.startSlot)
            const blockFork = forkConfig.getForkName(block.message.slot)
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

            const historicalSummariesProof = createProof(ssz[stateFork].BeaconState.fields.blockRoots.toView(state.blockRoots).node, {
                gindex: historicalSummariesPath.gindex,
                type: ProofType.single,
            }) as SingleProof

            const blockProof = HistoricalSummariesBlockProof.fromJson({
                slot: block.message.slot,
                historicalSummariesProof: historicalSummariesProof.witnesses.map((witness) => bytesToHex(witness)),
                beaconBlockProof: beaconBlockProof.witnesses.map((witness) => bytesToHex(witness)),
                beaconBlockRoot: bytesToHex(ssz[blockFork].BeaconBlock.value_toTree(fullBlock).root),
            })
            console.log(HistoricalSummariesBlockProof.toJson(blockProof))
        } catch (err) {
            console.log(err)
        }

    }
}

main().catch((err) => {
    console.log('caught error', err)
    process.exit(0)
})
