import { SignableENR } from '@chainsafe/enr'
import type { BlockHeader, JsonRpcBlock } from '@ethereumjs/block'
import { Block } from '@ethereumjs/block'
import { hexToBytes, randomBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, beforeAll, describe, it } from 'vitest'
import {
  EphemeralHeaderPayload,
  HistoryNetworkContentType,
  NetworkId,
  PortalNetwork,
  getContentKey,
} from '../../src/index.js'
import latestBlocks from '../networks/history/testData/latest3Blocks.json'

describe('should be able to retrieve ephemeral headers from a peer', () => {
  let headers: BlockHeader[]
  let headerPayload: Uint8Array
  let contentKey: Uint8Array
  beforeAll(() => {
    headers = []
    headers.push(Block.fromRPC(latestBlocks[0] as JsonRpcBlock, [], { setHardfork: true }).header)
    headers.push(Block.fromRPC(latestBlocks[1] as JsonRpcBlock, [], { setHardfork: true }).header)
    headers.push(Block.fromRPC(latestBlocks[2] as JsonRpcBlock, [], { setHardfork: true }).header)
    headerPayload = EphemeralHeaderPayload.serialize(headers.map((h) => h.serialize()))
    contentKey = getContentKey(HistoryNetworkContentType.EphemeralHeader, {
      blockHash: headers[0].hash(),
      ancestorCount: headers.length - 1,
    })
  })
  it('should be able to retrieve ephemeral headers from a peer', async () => {
    const privateKeys = [
      '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
      '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
    ]

    const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
    const enr1 = SignableENR.createFromPrivateKey(pk1)
    const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1]).slice(-36))
    const enr2 = SignableENR.createFromPrivateKey(pk2)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3198`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3199`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
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

    const node2 = await PortalNetwork.create({
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
    if ('content' in res!) {
      const payload = EphemeralHeaderPayload.deserialize(res.content)
      assert.equal(payload.length, headers.length)
      assert.deepEqual(payload[0], headers[0].serialize())
      assert.deepEqual(payload[1], headers[1].serialize())
      assert.deepEqual(payload[2], headers[2].serialize())
    } else {
      assert.fail('Expected content in response')
    }

    const contentKeyForOneAncestor = getContentKey(HistoryNetworkContentType.EphemeralHeader, {
      blockHash: headers[0].hash(),
      ancestorCount: 1,
    })

    const res2 = await network2!.sendFindContent(node1.discv5.enr.toENR(), contentKeyForOneAncestor)
    assert.exists(res2)
    if ('content' in res2!) {
      const payload = EphemeralHeaderPayload.deserialize(res2.content)
      assert.equal(payload.length, 1, 'should only get a single ancestor')
    } else {
      assert.fail('Expected content in response')
    }

    // Verify that we get an empty ephemeral headers payload for a random blockhash
    const res3 = await network2!.sendFindContent(
      node1.discv5.enr.toENR(),
      getContentKey(HistoryNetworkContentType.EphemeralHeader, {
        blockHash: randomBytes(32),
        ancestorCount: 255,
      }),
    )
    assert.exists(res3)
    if ('content' in res3!) {
      const payload = EphemeralHeaderPayload.deserialize(res3.content)
      assert.equal(payload.length, 0, 'should not get any headers for a random blockhash')
    } else {
      assert.fail('Expected content in response')
    }
  }, 10000)
})
