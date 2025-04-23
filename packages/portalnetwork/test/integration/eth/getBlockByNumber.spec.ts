import { SignableENR } from '@chainsafe/enr'
import { Block } from '@ethereumjs/block'
import { bytesToHex, concatBytes, hexToBytes } from '@ethereumjs/util'
import { privateKeyFromProtobuf } from '@libp2p/crypto/keys'
import { RunStatusCode } from '@lodestar/light-client'
import { ForkName } from '@lodestar/params'
import { ssz } from '@lodestar/types'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, describe, it, vi } from 'vitest'

import {
  AccumulatorProofType,
  BeaconNetworkContentType,
  LightClientBootstrapKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  NetworkId,
  TransportLayer,
  addRLPSerializedBlock,
  createPortalNetwork,
  generatePreMergeHeaderProof,
  getBeaconContentKey,
} from '../../../src/index.js'

import type { BeaconNetwork, HistoryNetwork } from '../../../src/index.js'

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

const pk1 = privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
const enr1 = SignableENR.createFromPrivateKey(pk1)
const pk2 = privateKeyFromProtobuf(hexToBytes(privateKeys[1]).slice(-36))
const enr2 = SignableENR.createFromPrivateKey(pk2)
describe(
  'retrieve block using number',
  async () => {
    const initMa: any = multiaddr('/ip4/127.0.0.1/udp/3090')
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr('/ip4/127.0.0.1/udp/3091')
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await createPortalNetwork({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        privateKey: pk1,
      },
    })

    const node2 = await createPortalNetwork({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
      config: {
        enr: enr2,
        bindAddrs: {
          ip4: initMa2,
        },
        privateKey: pk2,
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
    const epoch = epochData.serialized

    const blockRlp = block1000.raw
    const blockHash = block1000.hash
    const proof = AccumulatorProofType.serialize(
      await generatePreMergeHeaderProof(1000n, hexToBytes(epoch)),
    )
    await addRLPSerializedBlock(blockRlp, blockHash, network1, proof)
    await network1.sendPing(network2?.enr.toENR())
    const retrieved = await node2.ETH.getBlockByNumber(1000, false)
    it('should retrieve header', () => {
      assert.equal(Number(retrieved!.header.number), 1000, 'retrieved expected header')
    })

    await node1.stop()
    await node2.stop()
  },
  { timeout: 30000 },
)
// TODO: Fix this test once we have ephemeral headers implemented
// describe.skip('should find a block using "latest" and "finalized"', async () => {
//   vi.useFakeTimers({ shouldAdvanceTime: true, shouldClearNativeTimers: true })
//   vi.setSystemTime(1693431998000)
//   const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/31826`)
//   enr1.setLocationMultiaddr(initMa)

//   const node1 = await createPortalNetwork({
//     transport: TransportLayer.NODE,
//     supportedNetworks: [
//       { networkId: NetworkId.BeaconChainNetwork },
//       { networkId: NetworkId.HistoryNetwork },
//     ],
//     config: {
//       enr: enr1,
//       bindAddrs: {
//         ip4: initMa,
//       },
//       privateKey: pk1,
//     },
//   })

//   await node1.start()

//   const beacon = node1.networks.get(NetworkId.BeaconChainNetwork) as BeaconNetwork

//   const history = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
//   const bootstrapJSON = require('../testdata/bootstrap.json').data
//   const bootstrap = ssz.capella.LightClientBootstrap.fromJson(bootstrapJSON)
//   const range = require('../testdata/lcUpdateRange.json')
//   const capellaForkDigest = beacon.beaconConfig.forkName2ForkDigest(ForkName.capella)
//   const update1 = concatBytes(
//     capellaForkDigest,
//     ssz.capella.LightClientUpdate.serialize(ssz.capella.LightClientUpdate.fromJson(range[0].data)),
//   )
//   const update2 = concatBytes(
//     capellaForkDigest,
//     ssz.capella.LightClientUpdate.serialize(ssz.capella.LightClientUpdate.fromJson(range[1].data)),
//   )
//   const update3 = concatBytes(
//     capellaForkDigest,
//     ssz.capella.LightClientUpdate.serialize(ssz.capella.LightClientUpdate.fromJson(range[2].data)),
//   )

//   const optimisticUpdateJson = require('../testdata/optimisticUpdate.json')
//   const optimisticUpdate = ssz.capella.LightClientOptimisticUpdate.fromJson(optimisticUpdateJson)

//   await beacon.store(
//     getBeaconContentKey(
//       BeaconNetworkContentType.LightClientBootstrap,
//       LightClientBootstrapKey.serialize({
//         blockHash: ssz.phase0.BeaconBlockHeader.hashTreeRoot(bootstrap.header.beacon),
//       }),
//     ),
//     concatBytes(capellaForkDigest, ssz.capella.LightClientBootstrap.serialize(bootstrap)),
//   )

//   const updatesByRange = LightClientUpdatesByRange.serialize([update1, update2, update3])

//   const headBlockjson = require('../testdata/headBlock.json')
//   const headBlockblock = Block.fromRPC(headBlockjson.result, [], { setHardfork: true })
//   const finalizedBlockjson = require('../testdata/finalizedBlock.json')
//   const finalizedBlock = Block.fromRPC(finalizedBlockjson.result, [], { setHardfork: true })
//   await addRLPSerializedBlock(
//     bytesToHex(headBlockblock.serialize()),
//     bytesToHex(headBlockblock.hash()),
//     history,
//     [] as any,
//   )
//   await addRLPSerializedBlock(
//     bytesToHex(finalizedBlock.serialize()),
//     bytesToHex(finalizedBlock.hash()),
//     history,
//     [] as any,
//   )
//   await beacon.storeUpdateRange(updatesByRange)

//   await beacon.store(
//     getBeaconContentKey(
//       BeaconNetworkContentType.LightClientOptimisticUpdate,
//       LightClientOptimisticUpdateKey.serialize({
//         signatureSlot: BigInt(optimisticUpdate.signatureSlot),
//       }),
//     ),
//     concatBytes(
//       capellaForkDigest,
//       ssz.capella.LightClientOptimisticUpdate.serialize(optimisticUpdate),
//     ),
//   )

//   await beacon.initializeLightClient(
//     '0x3e733d7db0b70c17a00c125da9cce68cbdb8135c4400afedd88c17f11a3e3b7b',
//   )

//   while (beacon.lightClient!.status !== RunStatusCode.started) {
//     await new Promise((resolve) => setTimeout(() => resolve(undefined), 1000))
//     it('light client synced to latest epoch', () => {
//       assert.equal(
//         beacon.lightClient!.status,
//         RunStatusCode.started,
//         'light client synced to latest epoch successfully',
//       )
//     })
//   }

//   const latest = await node1.ETH.getBlockByNumber('latest', false)
//   const finalized = await node1.ETH.getBlockByNumber('finalized', false)
//   beacon.lightClient!.stop()

//   it('should find latest and finalized blocks', () => {
//     assert.deepEqual(latest?.hash(), headBlockblock.hash(), 'found latest block using `latest`')
//     assert.deepEqual(
//       finalized?.hash(),
//       finalizedBlock.hash(),
//       'found latest finalized block using `final`',
//     )
//   })
//   await node1.stop()
// }, 30000)
