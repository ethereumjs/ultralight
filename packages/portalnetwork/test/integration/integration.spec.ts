import { Block, BlockHeader } from '@ethereumjs/block'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { readFileSync } from 'fs'
import tape from 'tape'
import {
  addRLPSerializedBlock,
  BlockHeaderWithProof,
  fromHexString,
  getContentKey,
  ContentType,
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  toHexString,
  TransportLayer,
} from '../../src/index.js'
import { createRequire } from 'module'
import { EventEmitter } from 'events'
import { SignableENR } from '@chainsafe/discv5'
import { bytesToHex } from '@ethereumjs/util'
const require = createRequire(import.meta.url)

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

const testBlockData = require('../testData/testBlocks.json')
const epoch25 = readFileSync(
  './test/testData/0x03f216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70.portalcontent',
  { encoding: 'hex' },
)
const testBlocks: Block[] = testBlockData.slice(0, 26).map((testBlock: any) => {
  return Block.fromRLPSerializedBlock(fromHexString(testBlock.rlp), {
    setHardfork: true,
  })
})
const testHashes: Uint8Array[] = testBlocks.map((testBlock: Block) => {
  return testBlock.hash()
})
const testHashStrings: string[] = testHashes.map((testHash: Uint8Array) => {
  return toHexString(testHash)
})

tape('gossip test', async (t) => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
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
    supportedProtocols: [ProtocolId.HistoryNetwork],
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
  const protocol1 = node1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const protocol2 = node2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  await protocol1?.sendPing(protocol2?.enr!.toENR())
  t.equal(
    protocol1?.routingTable.getWithPending(
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
    )?.value.nodeId,
    '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
    'node1 added node2 to routing table',
  )
  await protocol1.store(
    ContentType.EpochAccumulator,
    '0xf216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70',
    fromHexString(epoch25),
  )
  // await protocol2.store(
  //   ContentType.EpochAccumulator,
  //   '0xf216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70',
  //   fromHexString(epoch25)
  // )
  t.equal(
    await protocol1.retrieve(
      '0x03f216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70',
    ),
    '0x' + epoch25,
    'epoch 25 added',
  )
  for await (const [_idx, testBlock] of testBlocks.entries()) {
    const proof = await protocol1.generateInclusionProof(testBlock.header.number)
    t.equal(proof.length, 15, 'proof generated for ' + toHexString(testBlock.hash()))
    const headerWith = BlockHeaderWithProof.serialize({
      header: testBlock.header.serialize(),
      proof: {
        selector: 1,
        value: proof,
      },
    })
    await protocol1.store(ContentType.BlockHeader, toHexString(testBlock.hash()), headerWith)
  }

  // Fancy workaround to allow us to "await" an event firing as expected following this - https://github.com/ljharb/tape/pull/503#issuecomment-619358911
  const end = new EventEmitter()
  const to = setTimeout(() => {
    t.fail('timeout')
    end.emit('end()')
  }, 10000)
  protocol2.on('ContentAdded', async (key, contentType, content) => {
    if (contentType === 0) {
      const headerWithProof = BlockHeaderWithProof.deserialize(fromHexString(content))
      const header = BlockHeader.fromRLPSerializedHeader(headerWithProof.header, {
        setHardfork: true,
      })
      t.ok(testHashStrings.includes(bytesToHex(header.hash())), 'node 2 found expected header')
      if (bytesToHex(header.hash()) === testHashStrings[6]) {
        t.pass('found expected last header')
        node2.removeAllListeners()
        await node1.stop()
        await node2.stop()
        clearTimeout(to)
        end.emit('end()')
      }
    }
  })
  await new Promise((resolve) => {
    end.once('end()', () => {
      resolve(true)
    })
  })
})

tape('FindContent', async (t) => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
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
    supportedProtocols: [ProtocolId.HistoryNetwork],
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
  const protocol1 = node1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const protocol2 = node2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol

  await protocol1.store(
    ContentType.EpochAccumulator,
    '0xf216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70',
    fromHexString(epoch25),
  )
  t.equal(
    await protocol1.retrieve(
      '0x03f216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70',
    ),
    '0x' + epoch25,
    'epoch 25 added',
  )
  await addRLPSerializedBlock(testBlockData[29].rlp, testBlockData[29].blockHash, protocol1)
  await protocol1.sendPing(protocol2?.enr!.toENR())

  await protocol2.sendFindContent(
    node1.discv5.enr.nodeId,
    fromHexString(
      getContentKey(ContentType.BlockHeader, fromHexString(testBlockData[29].blockHash)),
    ),
  )
  await new Promise((resolve) => {
    protocol2.on('ContentAdded', async (key, contentType, content) => {
      if (contentType === 0) {
        const headerWithProof = BlockHeaderWithProof.deserialize(fromHexString(content))
        const header = BlockHeader.fromRLPSerializedHeader(headerWithProof.header, {
          setHardfork: true,
        })
        t.equal(
          toHexString(header.hash()),
          testBlockData[29].blockHash,
          'retrieved expected header',
        )
        node2.removeAllListeners()
        await node1.stop()
        await node2.stop()
        resolve(() => {
          t.end()
        })
      }
    })
  })
})

tape('eth_getBlockByHash', async (t) => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
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
    supportedProtocols: [ProtocolId.HistoryNetwork],
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
  const protocol1 = node1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const protocol2 = node2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  await protocol1.store(
    ContentType.EpochAccumulator,
    '0xf216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70',
    fromHexString(epoch25),
  )
  t.equal(
    await protocol1.retrieve(
      '0x03f216a28afb2212269b634b9b44ff327a4a79f261640ff967f7e3283e3a184c70',
    ),
    '0x' + epoch25,
    'epoch 25 added',
  )
  await addRLPSerializedBlock(testBlockData[29].rlp, testBlockData[29].blockHash, protocol1)
  await protocol1.sendPing(protocol2?.enr!.toENR())

  const retrieved = await protocol2.ETH.getBlockByHash(testBlockData[29].blockHash, false)
  t.equal(toHexString(retrieved!.hash()), testBlockData[29].blockHash, 'retrieved expected header')

  await node1.stop()
  await node2.stop()
  t.end()
})

tape('eth_getBlockByNumber', async (t) => {
  t.plan(1)
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
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
    supportedProtocols: [ProtocolId.HistoryNetwork],
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
  const protocol1 = node1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const protocol2 = node2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol

  const epochData = require('../testData/testEpoch.json')
  const block1000 = require('../testData/testBlock1000.json')
  const epochHash = epochData.hash
  const epoch = epochData.serialized

  const blockRlp = block1000.raw
  const blockHash = block1000.hash

  await protocol1.store(ContentType.EpochAccumulator, epochHash, fromHexString(epoch))
  await protocol2.store(ContentType.EpochAccumulator, epochHash, fromHexString(epoch))
  await addRLPSerializedBlock(blockRlp, blockHash, protocol1)
  await protocol1.sendPing(protocol2?.enr!.toENR())
  const retrieved = await protocol2.ETH.getBlockByNumber(1000, false)

  t.equal(Number(retrieved!.header.number), 1000, 'retrieved expected header')

  await node1.stop()
  await node2.stop()
  t.end()
})
