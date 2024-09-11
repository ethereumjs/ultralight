import { SignableENR } from '@chainsafe/enr'
import { Block, BlockHeader } from '@ethereumjs/block'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { EventEmitter } from 'events'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { assert, describe, it } from 'vitest'

import {
  BlockHeaderWithProof,
  HistoryNetworkContentType,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  addRLPSerializedBlock,
  fromHexString,
  generatePreMergeHeaderProof,
  getContentKey,
  toHexString,
} from '../../src/index.js'

import type { HistoryNetwork } from '../../src/index.js'
const require = createRequire(import.meta.url)

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

const testBlockData = require('../testData/testBlocks.json')
const epoch25 =
  '0x' +
  readFileSync(
    './test/testData/0x03f216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70.portalcontent',
    { encoding: 'hex' },
  )
const testBlocks: Block[] = testBlockData.slice(0, 26).map((testBlock: any) => {
  return Block.fromRLPSerializedBlock(hexToBytes(testBlock.rlp), {
    setHardfork: true,
  })
})
const testHashes: Uint8Array[] = testBlocks.map((testBlock: Block) => {
  return testBlock.hash()
})
const testHashStrings: string[] = testHashes.map((testHash: Uint8Array) => {
  return toHexString(testHash)
})

describe('gossip test', async () => {
  const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/5000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/5001`)
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

  await node1.start()
  await node2.start()
  const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  await network1?.sendPing(network2?.enr!.toENR())
  assert.equal(
    network1?.routingTable.getWithPending(
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
    )?.value.nodeId,
    '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
    'node1 added node2 to routing table',
  )
  for await (const [_idx, testBlock] of testBlocks.entries()) {
    const proof = await generatePreMergeHeaderProof(testBlock.header.number, hexToBytes(epoch25))
    assert.equal(proof.length, 15, 'proof generated for ' + toHexString(testBlock.hash()))
    const headerWith = BlockHeaderWithProof.serialize({
      header: testBlock.header.serialize(),
      proof: {
        selector: 1,
        value: proof,
      },
    })
    const headerKey = getContentKey(HistoryNetworkContentType.BlockHeader, testBlock.hash())
    await network1.store(headerKey, headerWith)
  }

  // Fancy workaround to allow us to "await" an event firing as expected following this - https://github.com/ljharb/tape/pull/503#issuecomment-619358911
  const end = new EventEmitter()
  network2.on('ContentAdded', async (key, content: Uint8Array) => {
    const contentType = fromHexString(key)[0]
    if (contentType === 0) {
      const headerWithProof = BlockHeaderWithProof.deserialize(content)
      const header = BlockHeader.fromRLPSerializedHeader(headerWithProof.header, {
        setHardfork: true,
      })
      assert.ok(testHashStrings.includes(bytesToHex(header.hash())), 'node 2 found expected header')
      if (bytesToHex(header.hash()) === testHashStrings[6]) {
        assert.ok(true, 'found expected last header')
        node2.removeAllListeners()
        await node1.stop()
        await node2.stop()
        end.emit('end()')
      }
    }
  })
  const ended = await new Promise((resolve) => {
    end.once('end()', () => {
      resolve(true)
    })
  })
  it('should find all headers', () => {
    assert.isTrue(ended)
  })
}, 40000)

describe('FindContent', async () => {
  const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3070`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3071`)
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

  await node1.start()
  await node2.start()
  const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

  const witnesses = await generatePreMergeHeaderProof(
    BigInt(testBlockData[29].number),
    hexToBytes(epoch25),
  )
  await addRLPSerializedBlock(
    testBlockData[29].rlp,
    testBlockData[29].blockHash,
    network1,
    witnesses,
  )
  await network1.sendPing(network2?.enr!.toENR())

  const res = await network2.sendFindContent(
    node1.discv5.enr.nodeId,
    hexToBytes(
      getContentKey(
        HistoryNetworkContentType.BlockHeaderByNumber,
        BigInt(testBlockData[29].number),
      ),
    ),
  )
  const headerWithProof = BlockHeaderWithProof.deserialize(res!.value as Uint8Array)
  const header = BlockHeader.fromRLPSerializedHeader(headerWithProof.header, {
    setHardfork: true,
  })

  node2.removeAllListeners()
  await node1.stop()
  await node2.stop()
  it('should find content', () => {
    assert.equal(
      toHexString(header.hash()),
      testBlockData[29].blockHash,
      'retrieved expected header',
    )
  })
})

describe('eth_getBlockByHash', async () => {
  const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3080`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3081`)
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

  await node1.start()
  await node2.start()
  const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const witnesses = await generatePreMergeHeaderProof(
    BigInt(testBlockData[29].number),
    hexToBytes(epoch25),
  )
  await addRLPSerializedBlock(
    testBlockData[29].rlp,
    testBlockData[29].blockHash,
    network1,
    witnesses,
  )
  await network1.sendPing(network2?.enr!.toENR())

  const retrieved = await network2.portal.ETH.getBlockByHash(testBlockData[29].blockHash, false)

  await node1.stop()
  await node2.stop()
  it('should find content', () => {
    assert.equal(
      toHexString(retrieved!.hash()),
      testBlockData[29].blockHash,
      'retrieved expected header',
    )
  })
})
