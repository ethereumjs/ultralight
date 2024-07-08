import { SignableENR } from '@chainsafe/enr'
import { Block } from '@ethereumjs/block'
import { concatBytes, hexToBytes } from '@ethereumjs/util'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { RunStatusCode } from '@lodestar/light-client'
import { ForkName } from '@lodestar/params'
import { ssz } from '@lodestar/types'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, describe, it, vi } from 'vitest'

import {
  BeaconLightClientNetworkContentType,
  HistoryNetworkContentType,
  LightClientBootstrapKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  addRLPSerializedBlock,
  getBeaconContentKey,
  getContentKey,
  toHexString,
} from '../../../src/index.js'

import type { BeaconLightClientNetwork, HistoryNetwork } from '../../../src/index.js'

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]
describe('eth_getBlockByNumber', () => {
  it(
    'retrieve block using number',
    async () => {
      const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
      const enr1 = SignableENR.createFromPeerId(id1)
      const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3090`)
      enr1.setLocationMultiaddr(initMa)
      const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
      const enr2 = SignableENR.createFromPeerId(id2)
      const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3091`)
      enr2.setLocationMultiaddr(initMa2)
      const node1 = await PortalNetwork.create({
        transport: TransportLayer.NODE,
        supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
        config: {
          enr: enr1,
          bindAddrs: {
            ip4: initMa,
          },
          peerId: id1,
        },
      })

      const node2 = await PortalNetwork.create({
        transport: TransportLayer.NODE,
        supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
        config: {
          enr: enr2,
          bindAddrs: {
            ip4: initMa2,
          },
          peerId: id2,
        },
      })

      // node1.enableLog('*Portal*,-uTP*')
      // node2.enableLog('*Portal*,-uTP*')

      await node1.start()
      await node2.start()
      const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
      const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

      const epochData = require('../../testData/testEpoch.json')
      const block1000 = require('../../testData/testBlock1000.json')
      const epochHash = epochData.hash
      const epoch = epochData.serialized

      const blockRlp = block1000.raw
      const blockHash = block1000.hash
      const epochKey = getContentKey(HistoryNetworkContentType.EpochAccumulator, epochHash)
      await network1.store(epochKey, hexToBytes(epoch))
      await addRLPSerializedBlock(blockRlp, blockHash, network1)
      await network1.sendPing(network2?.enr!.toENR())
      const retrieved = await node2.ETH.getBlockByNumber(1000, false)

      assert.equal(Number(retrieved!.header.number), 1000, 'retrieved expected header')

      await node1.stop()
      await node2.stop()
    },
    { timeout: 30000 },
  )
  it('should find a block using "latest" and "finalized"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, shouldClearNativeTimers: true })
    vi.setSystemTime(1693431998000)
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/31826`)
    enr1.setLocationMultiaddr(initMa)

    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [
        { networkId: NetworkId.BeaconChainNetwork },
        { networkId: NetworkId.HistoryNetwork },
      ],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        peerId: id1,
      },
    })

    await node1.start()

    const beacon = node1.networks.get(NetworkId.BeaconChainNetwork) as BeaconLightClientNetwork

    const history = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const bootstrapJSON = require('../testdata/bootstrap.json').data
    const bootstrap = ssz.capella.LightClientBootstrap.fromJson(bootstrapJSON)
    const range = require('../testdata/lcUpdateRange.json')
    const capellaForkDigest = beacon.beaconConfig.forkName2ForkDigest(ForkName.capella)
    const update1 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[0].data),
      ),
    )
    const update2 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[1].data),
      ),
    )
    const update3 = concatBytes(
      capellaForkDigest,
      ssz.capella.LightClientUpdate.serialize(
        ssz.capella.LightClientUpdate.fromJson(range[2].data),
      ),
    )

    const optimisticUpdateJson = require('../testdata/optimisticUpdate.json')
    const optimisticUpdate = ssz.capella.LightClientOptimisticUpdate.fromJson(optimisticUpdateJson)

    await beacon.store(
      getBeaconContentKey(
        BeaconLightClientNetworkContentType.LightClientBootstrap,
        LightClientBootstrapKey.serialize({
          blockHash: ssz.phase0.BeaconBlockHeader.hashTreeRoot(bootstrap.header.beacon),
        }),
      ),
      concatBytes(capellaForkDigest, ssz.capella.LightClientBootstrap.serialize(bootstrap)),
    )

    const updatesByRange = LightClientUpdatesByRange.serialize([update1, update2, update3])

    const headBlockjson = require('../testdata/headBlock.json')
    const headBlockblock = Block.fromRPC(headBlockjson.result, [], { setHardfork: true })
    const finalizedBlockjson = require('../testdata/finalizedBlock.json')
    const finalizedBlock = Block.fromRPC(finalizedBlockjson.result, [], { setHardfork: true })
    await addRLPSerializedBlock(
      toHexString(headBlockblock.serialize()),
      toHexString(headBlockblock.hash()),
      history,
    )
    await addRLPSerializedBlock(
      toHexString(finalizedBlock.serialize()),
      toHexString(finalizedBlock.hash()),
      history,
    )
    await beacon.storeUpdateRange(updatesByRange)

    await beacon.store(
      getBeaconContentKey(
        BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
        LightClientOptimisticUpdateKey.serialize({
          signatureSlot: BigInt(optimisticUpdate.signatureSlot),
        }),
      ),
      concatBytes(
        capellaForkDigest,
        ssz.capella.LightClientOptimisticUpdate.serialize(optimisticUpdate),
      ),
    )

    await beacon.initializeLightClient(
      '0x3e733d7db0b70c17a00c125da9cce68cbdb8135c4400afedd88c17f11a3e3b7b',
    )

    while (beacon.lightClient!.status !== RunStatusCode.started) {
      await new Promise((resolve) => setTimeout(() => resolve(undefined), 1000))
    }
    assert.equal(
      beacon.lightClient!.status,
      RunStatusCode.started,
      'light client synced to latest epoch successfully',
    )

    const latest = await node1.ETH.getBlockByNumber('latest', false)
    const finalized = await node1.ETH.getBlockByNumber('finalized', false)
    beacon.lightClient!.stop()

    assert.deepEqual(latest?.hash(), headBlockblock.hash(), 'found latest block using `latest`')
    assert.deepEqual(
      finalized?.hash(),
      finalizedBlock.hash(),
      'found latest finalized block using `final`',
    )
    await node1.stop()
  }, 30000)
})
