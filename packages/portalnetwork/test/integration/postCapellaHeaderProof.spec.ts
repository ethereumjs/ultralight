import { readFileSync } from 'fs'
import { ssz } from '@lodestar/types'
import { concatBytes, hexToBytes } from '@ethereumjs/util'
import {
    BeaconLightClientNetworkContentType,
    HistoricalSummariesKey,
    HistoricalSummariesWithProof,
    HistoryNetworkContentType,
    LightClientBootstrapKey,
    NetworkId,
    PortalNetwork,
    getBeaconContentKey,
    getContentKey
} from '../../src/index.js'
import { createBeaconConfig } from '@lodestar/config'
import { mainnetChainConfig } from '@lodestar/config/configs'
import { genesisData } from '@lodestar/config/networks'
import { computeEpochAtSlot, getChainForkConfigFromNetwork } from '@lodestar/light-client/utils'
import { assert, describe, it, vi } from 'vitest'
import { multiaddr } from '@multiformats/multiaddr'
import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'


describe('Block Bridge Data Test', () => {
    it('should store and retrieve block header data', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true, shouldClearNativeTimers: true })
        vi.setSystemTime(1737151319000)
        const privateKeys = [
            '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
            '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
        ]
        const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
        const enr1 = SignableENR.createFromPrivateKey(pk1)
        const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/5034`)

        const client = await PortalNetwork.create({
            supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }, { networkId: NetworkId.BeaconChainNetwork }], config: { enr: enr1, bindAddrs: { ip4: initMa }, privateKey: pk1 }
        })
        await client.start()

        const bootstrapHex = JSON.parse(readFileSync('./test/integration/testdata/postCapellaData/bootstrap.json', 'utf8'))
        const historicalSummariesJson = JSON.parse(readFileSync('./test/integration/testdata/postCapellaData/historical_summaries.json', 'utf8'))
        const fullBlock = JSON.parse(readFileSync('./test/integration/testdata/postCapellaData/full_block.json', 'utf8'))
        const headerWithProof = JSON.parse(readFileSync('./test/integration/testdata/postCapellaData/header_with_proof.json', 'utf8'))

        const bootstrap = ssz.deneb.LightClientBootstrap.deserialize(hexToBytes(bootstrapHex.bootstrap))
        const bootstrapRoot = '0x47a956b9cd45c73a60dac4c89dc869a5faa46a9d5d802486f31025c74d41ef39'

        // Get fork info
        const forkConfig = getChainForkConfigFromNetwork('mainnet')
        const bootstrapSlot = bootstrap.header.beacon.slot
        const forkName = forkConfig.getForkName(bootstrapSlot)
        const forkDigest = createBeaconConfig(
            mainnetChainConfig,
            hexToBytes(genesisData.mainnet.genesisValidatorsRoot)
        ).forkName2ForkDigest(forkName)

        // Store bootstrap

        const bootstrapKey = getBeaconContentKey(
            BeaconLightClientNetworkContentType.LightClientBootstrap,
            LightClientBootstrapKey.serialize({ blockHash: hexToBytes(bootstrapRoot) })
        )
        const bootstrapValue = concatBytes(
            forkDigest,
            ssz.deneb.LightClientBootstrap.serialize(bootstrap)
        )


        const beacon = client.network()['0x500c']
        const history = client.network()['0x500b']

        await beacon?.store(bootstrapKey, bootstrapValue)

        // Start light client
        await beacon?.initializeLightClient(bootstrapRoot)

        const historicalSummariesEpoch = computeEpochAtSlot(bootstrapSlot)

        // Store historical summaries
        const historicalSummariesObj = HistoricalSummariesWithProof.fromJson({
            epoch: historicalSummariesEpoch,
            historical_summaries: historicalSummariesJson.historical_summaries,
            proof: historicalSummariesJson.proof
        })
        const summariesKey = getBeaconContentKey(
            BeaconLightClientNetworkContentType.HistoricalSummaries,
            HistoricalSummariesKey.serialize({ epoch: BigInt(historicalSummariesEpoch) })
        )
        const summariesValue = concatBytes(
            forkDigest,
            HistoricalSummariesWithProof.serialize(historicalSummariesObj)
        )
        await beacon?.store(summariesKey, summariesValue)

        // Store header with proof
        const blockHash = fullBlock.data.message.body.execution_payload.block_hash

        const headerKey = getContentKey(
            HistoryNetworkContentType.BlockHeader,
            hexToBytes(blockHash)
        )
        await history?.store(headerKey, hexToBytes(headerWithProof))

        // Verify block header can be retrieved
        const retrievedHeader = await client.ETH.getBlockByHash(hexToBytes(blockHash), false)
        assert.equal(retrievedHeader!.header.number, fullBlock.data.message.body.execution_payload.block_number)

        await client.stop()
    }, 10000)
}) 