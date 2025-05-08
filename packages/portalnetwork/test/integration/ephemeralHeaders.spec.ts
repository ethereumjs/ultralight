import { SignableENR } from '@chainsafe/enr'
import type { BlockHeader, JSONRPCBlock } from '@ethereumjs/block'
import { createBlockFromRPC } from '@ethereumjs/block'
import { bytesToHex, concatBytes, hexToBytes, randomBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, beforeAll, describe, it, vi } from 'vitest'
import {
  type BeaconNetwork,
  BeaconNetworkContentType,
  EphemeralHeaderOfferPayload,
  EphemeralHeaderPayload,
  HistoryNetworkContentType,
  LightClientBootstrapKey,
  NetworkId,
  createPortalNetwork,
  getBeaconContentKey,
  getContentKey,
} from '../../src/index.js'
import latestBlocks from '../networks/history/testData/latest3Blocks.json'
import { ssz } from '@lodestar/types'
import { createBeaconConfig, createChainForkConfig } from '@lodestar/config'
import { genesisData, mainnetChainConfig } from '@lodestar/config/networks'
import { ForkName } from '@lodestar/params'

describe('should be able to retrieve ephemeral headers from a peer', () => {
  let headers: BlockHeader[]
  let headerPayload: Uint8Array
  let contentKey: Uint8Array
  beforeAll(() => {
    headers = []
    headers.push(
      createBlockFromRPC(latestBlocks[0] as JSONRPCBlock, [], {
        setHardfork: true,
      }).header,
    )
    headers.push(
      createBlockFromRPC(latestBlocks[1] as JSONRPCBlock, [], {
        setHardfork: true,
      }).header,
    )
    headers.push(
      createBlockFromRPC(latestBlocks[2] as JSONRPCBlock, [], {
        setHardfork: true,
      }).header,
    )
    headerPayload = EphemeralHeaderPayload.serialize(headers.map((h) => h.serialize()))
    contentKey = getContentKey(HistoryNetworkContentType.EphemeralHeaderFindContent, {
      blockHash: headers[0].hash(),
      ancestorCount: headers.length - 1,
    })
  })
  it('should be able to retrieve ephemeral headers from a peer', async () => {
    const privateKeys = [
      '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
      '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
    ]

    const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0] as `0x${string}`).slice(-36))
    const enr1 = SignableENR.createFromPrivateKey(pk1)
    const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1] as `0x${string}`).slice(-36))
    const enr2 = SignableENR.createFromPrivateKey(pk2)
    const initMa: any = multiaddr('/ip4/127.0.0.1/udp/3198')
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr('/ip4/127.0.0.1/udp/3199')
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await createPortalNetwork({
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.BeaconChainNetwork },
      ],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        privateKey: pk1,
      },
    })

    const node2 = await createPortalNetwork({
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.BeaconChainNetwork },
      ],
      config: {
        enr: enr2,
        bindAddrs: {
          ip4: initMa2,
        },
        privateKey: pk2,
      },
    })
    await node1.start()
    await node2.start()
    const network1 = node1.network()['0x500b']
    await network1!.store(contentKey, headerPayload)
    const network2 = node2.network()['0x500b']
    const res = await network2!.sendFindContent(node1.discv5.enr.toENR(), contentKey)
    assert.exists(res)
    if ('content' in res) {
      const payload = EphemeralHeaderPayload.deserialize(res.content)
      assert.equal(payload.length, headers.length)
      assert.deepEqual(payload[0], headers[0].serialize())
      assert.deepEqual(payload[1], headers[1].serialize())
      assert.deepEqual(payload[2], headers[2].serialize())
    } else {
      assert.fail('Expected content in response')
    }

    // Verify that we get a single ancestor for a content key with an ancestor count of 1
    const contentKeyForOneAncestor = getContentKey(HistoryNetworkContentType.EphemeralHeaderFindContent, {
      blockHash: headers[0].hash(),
      ancestorCount: 1,
    })

    const res2 = await network2!.sendFindContent(node1.discv5.enr.toENR(), contentKeyForOneAncestor)
    assert.exists(res2)
    if ('content' in res2) {
      const payload = EphemeralHeaderPayload.deserialize(res2.content)
      assert.equal(payload.length, 2, 'should only get a single ancestor')
    } else {
      assert.fail('Expected content in response')
    }

    // Verify that we get an empty ephemeral headers payload for a random blockhash
    const res3 = await network2!.sendFindContent(
      node1.discv5.enr.toENR(),
      getContentKey(HistoryNetworkContentType.EphemeralHeaderFindContent, {
        blockHash: randomBytes(32),
        ancestorCount: 255,
      }),
    )
    assert.exists(res3)
    if ('content' in res3) {
      const payload = EphemeralHeaderPayload.deserialize(res3.content)
      assert.equal(payload.length, 0, 'should not get any headers for a random blockhash')
    } else {
      assert.fail('Expected content in response')
    }
  })
})
describe('should offer headers to peers', () => {
  it.only('should offer headers to peers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, shouldClearNativeTimers: true })
    vi.setSystemTime(1746551640000)
    const header22426081 = await import('./testdata/postDenebData/header22426081.json')
    const header22426082 = await import('./testdata/postDenebData/header22426082.json')
    const header22426083 = await import('./testdata/postDenebData/header22426083.json')
    const headers: BlockHeader[] = []
    headers.push(
      createBlockFromRPC(header22426081 as JSONRPCBlock, [], {
        setHardfork: true,
      }).header,
    )
    headers.push(
      createBlockFromRPC(header22426082 as JSONRPCBlock, [], {
        setHardfork: true,
      }).header,
    )
    headers.push(
      createBlockFromRPC(header22426083 as JSONRPCBlock, [], {
        setHardfork: true,
      }).header,
    )
    headers.reverse()
    const offerPayload = headers.map((h) => getContentKey(HistoryNetworkContentType.EphemeralHeaderOffer, h.hash()))

    const bootstrapJson = await import('./testdata/postDenebData/bootstrap.json')
    const bootstrap = ssz.deneb.LightClientBootstrap.fromJson(bootstrapJson.data)
    const bootstrapRoot = ssz.phase0.BeaconBlockHeader.hashTreeRoot(bootstrap.header.beacon)
    const bootstrapKey = getBeaconContentKey(BeaconNetworkContentType.LightClientBootstrap, LightClientBootstrapKey.serialize({ blockHash: ssz.phase0.BeaconBlockHeader.hashTreeRoot(bootstrap.header.beacon) }))
    const chainConfig = createBeaconConfig(mainnetChainConfig, hexToBytes(genesisData.mainnet.genesisValidatorsRoot as `0x${string}`))
    const forkDigest = chainConfig.forkName2ForkDigest(ForkName.deneb)
    const privateKeys = [
      '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
      '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
    ]

    const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0] as `0x${string}`).slice(-36))
    const enr1 = SignableENR.createFromPrivateKey(pk1)
    const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1] as `0x${string}`).slice(-36))
    const enr2 = SignableENR.createFromPrivateKey(pk2)
    const initMa: any = multiaddr('/ip4/127.0.0.1/udp/3200')
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr('/ip4/127.0.0.1/udp/3201')
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await createPortalNetwork({
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.BeaconChainNetwork },
      ],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        privateKey: pk1,
      },
    })

    const node2 = await createPortalNetwork({
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.BeaconChainNetwork },
      ],
      config: {
        enr: enr2,
        bindAddrs: {
          ip4: initMa2,
        },
        privateKey: pk2,
      },
    })
    node1.enableLog('cheese')
    node2.enableLog('*Portal*')
    await node1.start()
    await node2.start()
    const history1 = node1.network()['0x500b']
    const history2 = node2.network()['0x500b']
    await node1.network()['0x500c']!.store(bootstrapKey, concatBytes(forkDigest, ssz.deneb.LightClientBootstrap.serialize(bootstrap)))
    await node2.network()['0x500c']!.store(bootstrapKey, concatBytes(forkDigest, ssz.deneb.LightClientBootstrap.serialize(bootstrap)))
    await history1?.store(offerPayload[0], EphemeralHeaderOfferPayload.serialize({ header: headers[0].serialize() }))
    await history1?.store(offerPayload[1], EphemeralHeaderOfferPayload.serialize({ header: headers[1].serialize() }))
    await history1?.store(offerPayload[2], EphemeralHeaderOfferPayload.serialize({ header: headers[2].serialize() }))
    await (node2.network()['0x500c'] as BeaconNetwork).initializeLightClient(bytesToHex(bootstrapRoot))
    const res = await history1!.sendOffer(node2.discv5.enr.toENR(), offerPayload, headers.map(h => h.serialize()))
    assert.exists(res)
    console.log(res)
  })
})