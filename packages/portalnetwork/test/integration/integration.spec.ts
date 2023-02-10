import { Block, BlockHeader } from '@ethereumjs/block'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import tape from 'tape'
import {
  addRLPSerializedBlock,
  ENR,
  fromHexString,
  getHistoryNetworkContentKey,
  HistoryNetworkContentTypes,
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  toHexString,
  TransportLayer,
} from '../../src/index.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

const testBlockData = require('../testData/testBlocks.json')
const testBlocks: Block[] = testBlockData.slice(0, 26).map((testBlock: any) => {
  return Block.fromRLPSerializedBlock(Buffer.from(fromHexString(testBlock.rlp)), {
    hardforkByBlockNumber: true,
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
  const enr1 = ENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = ENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr1,
      multiaddr: initMa,
      peerId: id1,
    },
  })
  const node2 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr2,
      multiaddr: initMa2,
      peerId: id2,
    },
  })

  await node1.start()
  await node2.start()
  const protocol1 = node1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const protocol2 = node2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  await protocol1?.sendPing(protocol2?.client.discv5.enr!)
  t.equal(
    protocol1?.routingTable.getValue(
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed'
    )?.nodeId,
    '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
    'node1 added node2 to routing table'
  )

  for await (const [_idx, testBlock] of testBlocks.entries()) {
    addRLPSerializedBlock(
      '0x' + testBlock.serialize().toString('hex'),
      '0x' + testBlock.hash().toString('hex'),
      protocol1
    )
  }

  // Fancy workaround to allow us to "await" an event firing as expected following this - https://github.com/ljharb/tape/pull/503#issuecomment-619358911
  await new Promise((resolve) => {
    node2.on('ContentAdded', async (key, contentType, content) => {
      if (contentType === 0) {
        const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(fromHexString(content)), {
          hardforkByBlockNumber: true,
        })
        t.ok(
          testHashStrings.includes('0x' + header.hash().toString('hex')),
          'node 2 found expected header'
        )
        if ('0x' + header.hash().toString('hex') === testHashStrings[6]) {
          t.pass('found expected last header')
          await node1.stop()
          await node2.stop()
          resolve(() => t.end())
        }
      }
    })
  })
})

tape('FindContent', async (t) => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = ENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = ENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr1,
      multiaddr: initMa,
      peerId: id1,
    },
  })

  const node2 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr2,
      multiaddr: initMa2,
      peerId: id2,
    },
  })

  await node1.start()
  await node2.start()
  const protocol1 = node1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const protocol2 = node2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol

  await addRLPSerializedBlock(testBlockData[29].rlp, testBlockData[29].blockHash, protocol1)
  await protocol1.sendPing(protocol2?.client.discv5.enr!)

  const retrieved = await protocol2.sendFindContent(
    node1.discv5.enr.nodeId,
    fromHexString(
      getHistoryNetworkContentKey(
        HistoryNetworkContentTypes.BlockHeader,
        fromHexString(testBlockData[29].blockHash)
      )
    )
  )

  const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(retrieved!.value as Uint8Array), {
    hardforkByBlockNumber: true,
  })
  t.equal(toHexString(header.hash()), testBlockData[29].blockHash, 'retrieved expected header')

  await node1.stop()
  await node2.stop()
  t.end()
})

tape('eth_getBlockByHash', async (t) => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = ENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = ENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr1,
      multiaddr: initMa,
      peerId: id1,
    },
  })

  const node2 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr2,
      multiaddr: initMa2,
      peerId: id2,
    },
  })

  await node1.start()
  await node2.start()
  const protocol1 = node1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const protocol2 = node2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol

  await addRLPSerializedBlock(testBlockData[29].rlp, testBlockData[29].blockHash, protocol1)
  await protocol1.sendPing(protocol2?.client.discv5.enr!)

  const retrieved = await protocol2.ETH.getBlockByHash(testBlockData[29].blockHash, false)

  t.equal(toHexString(retrieved!.hash()), testBlockData[29].blockHash, 'retrieved expected header')

  await node1.stop()
  await node2.stop()
  t.end()
})

tape('eth_getBlockByNumber', async (t) => {
  t.plan(1)
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = ENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = ENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr1,
      multiaddr: initMa,
      peerId: id1,
    },
  })

  const node2 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr2,
      multiaddr: initMa2,
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

  await protocol1.addContentToHistory(
    HistoryNetworkContentTypes.EpochAccumulator,
    epochHash,
    fromHexString(epoch)
  )
  await addRLPSerializedBlock(blockRlp, blockHash, protocol1)
  await protocol1.sendPing(protocol2?.client.discv5.enr!)

  const retrieved = await protocol2.ETH.getBlockByNumber(1000, false)

  t.equal(Number(retrieved!.header.number), 1000, 'retrieved expected header')

  await node1.stop()
  await node2.stop()
})