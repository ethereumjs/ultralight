import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex, equalsBytes } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'
import { HistoricalRootsBlockProof, slotToHistoricalBatchIndex } from 'portalnetwork'
import type { SingleProof } from '@chainsafe/persistent-merkle-tree'
import { computeEpochAtSlot, computeSyncPeriodAtSlot, getCurrentSlot } from '@lodestar/light-client/utils'
import { mainnetChainConfig } from '@lodestar/config/configs'
import { readFileSync } from 'fs'
import { getEraIndexes } from '../../era/src/helpers'
import { readEntry } from '../../era/src/helpers'
import { decompressBeaconState } from '../../era/src/helpers'

const { Client } = jayson

const main = async () => {
    const beaconConfig = mainnetChainConfig
    const beaconNode = 'https://lodestar-mainnet.chainsafe.io'
    const _ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

    const currentSlot = getCurrentSlot(beaconConfig, 1606824000)
    const currentEpoch = computeEpochAtSlot(Number(currentSlot))
    console.log('Current Epoch: ', currentEpoch)

    // const pastEpochEndSlot = (currentEpoch * 32) - 1
    // console.log('Past Epoch End Slot: ', pastEpochEndSlot)
    // console.log('Retrieving latest historical summaries...')
    // const res2 = await fetch(beaconNode + `/eth/v1/lodestar/historical_summaries/${pastEpochEndSlot}`)
    // const res2Json = await res2.json()
    // console.log(res2Json)
    // const historicalSummaries = ssz.capella.BeaconState.fields.historicalSummaries.fromJson(res2Json.data.historical_summaries)

    console.log(`Reading era file for period ${computeSyncPeriodAtSlot(currentSlot) - 2}`)
    const eraFile = new Uint8Array(readFileSync(`./scripts/eras/mainnet-01321-9d82e6dc.era`))
    const indices = getEraIndexes(eraFile)
    const stateEntry = readEntry(
        eraFile.slice(indices.stateSlotIndex.recordStart + indices.stateSlotIndex.slotOffsets[0]),
    )

    const state = await decompressBeaconState(stateEntry.data, indices.stateSlotIndex.startSlot)
    console.log(eraFile.length, indices.blockSlotIndex!.slotOffsets[0], indices.blockSlotIndex!.slotOffsets[1])
    const blockEntry = readEntry(
        eraFile.slice(eraFile.length + indices.blockSlotIndex!.slotOffsets[0], eraFile.length + indices.blockSlotIndex!.slotOffsets[1]),
    )
    console.log(blockEntry)
    const block = ssz.bellatrix.BeaconBlock.fromJson(blockEntry.data)
    console.log('Block sync period: ', computeSyncPeriodAtSlot(Number(block.slot)))

    const elBlockHashPath = ssz.bellatrix.BeaconBlock.getPathInfo([
        'body',
        'executionPayload',
        'blockHash',
    ])

    const beaconBlockProof = createProof(ssz.bellatrix.BeaconBlock.toView(block).node, {
        gindex: elBlockHashPath.gindex,
        type: ProofType.single,
    }) as SingleProof

    const batchIndex = Number(slotToHistoricalBatchIndex(BigInt(block.slot)))
    const historicalRootsPath = ssz.phase0.HistoricalBatch.getPathInfo([
        'blockRoots',
        batchIndex,
    ])
    console.log(
        ` blockRoot: ${bytesToHex(ssz.bellatrix.BeaconBlock.value_toTree(block).root)} and found in period ${Math.floor(block.slot / 8192)}`,
    )

    const historicalRootsProof = createProof(historicalSummaries[historicalSummaries.length - 1], {
        gindex: historicalRootsPath.gindex,
        type: ProofType.single,
    }) as SingleProof
    const headerProof = HistoricalRootsBlockProof.fromJson({
        slot: block.slot,
        historicalRootsProof: historicalRootsProof.witnesses.map((witness) => bytesToHex(witness)),
        beaconBlockHeaderProof: beaconBlockProof.witnesses.map((witness) => bytesToHex(witness)),
        beaconBlockHeaderRoot: bytesToHex(ssz.bellatrix.BeaconBlock.value_toTree(block).root),
    })
    console.log(HistoricalRootsBlockProof.toJson(headerProof))
}

main().catch((err) => {
    console.log('caught error', err)
    process.exit(0)
})
