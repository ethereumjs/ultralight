import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { bytesToHex, equalsBytes } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'
import jayson from 'jayson/promise/index.js'
import { HistoricalRootsBlockProof, slotToHistoricalBatchIndex } from 'portalnetwork'
import type { SingleProof } from '@chainsafe/persistent-merkle-tree'
import { computeEpochAtSlot } from '@lodestar/light-client/utils'

const { Client } = jayson

const main = async () => {
    const beaconNode = 'https://lodestar-mainnet.chainsafe.io'
    const _ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

    console.log('Retrieving head beacon block...')
    const res = (await (await fetch(beaconNode + `/eth/v2/beacon/blocks/head`)).json()).data
    const block = ssz.bellatrix.BeaconBlock.fromJson(res.message)
    const elBlockHashPath = ssz.bellatrix.BeaconBlock.getPathInfo([
        'body',
        'executionPayload',
        'blockHash',
    ])

    const currentEpoch = computeEpochAtSlot(block.slot)
    console.log('Current epoch: ', currentEpoch)
    console.log('Retrieving latest historical summaries...')
    const res2 = await fetch(beaconNode + `/eth/v1/lodestar/historical_summaries/${currentEpoch * 32}`)
    const res2Json = await res2.json()
    console.log(res2Json)
    const historicalSummaries = ssz.capella.BeaconState.fields.historicalSummaries.fromJson(res2Json.data.historical_summaries)


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
        `Head Block blockRoot: ${bytesToHex(ssz.bellatrix.BeaconBlock.value_toTree(block).root)} and found in period ${Math.floor(block.slot / 8192)}`,
    )

    const historicalRootsProof = createProof(historicalSummaries[historicalSummaries.length - 1]., {
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
