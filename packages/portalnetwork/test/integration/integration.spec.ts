import { Block, BlockHeader } from '@ethereumjs/block'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import tape from 'tape'
import {
  addRLPSerializedBlock,
  ENR,
  fromHexString,
  HistoryNetworkContentKeyType,
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

const testBlockData = require('./testBlocks.json')
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

tape('integration tests', async (t) => {
  t.plan(2)
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
  node1.enableLog('*Portal*,-uTP*')
  const node2 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.HistoryNetwork],
    config: {
      enr: enr2,
      multiaddr: initMa2,
      peerId: id2,
    },
  })
  node2.enableLog('*Portal*,-uTP*')

  await node1.start()
  await node2.start()
  const protocol1 = node1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const protocol2 = node2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  await protocol1?.sendPing(protocol2?.client.discv5.enr!)
  t.equal(
    protocol1?.routingTable.getValue(
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed'
    )?.nodeId,
    '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed'
  )

  for await (const [idx, testBlock] of testBlocks.entries()) {
    addRLPSerializedBlock(
      '0x' + testBlock.serialize().toString('hex'),
      '0x' + testBlock.hash().toString('hex'),
      protocol1
    )
  }

  // Fancy workaround to allow us to "await" an event firing as expected following this - https://github.com/ljharb/tape/pull/503#issuecomment-619358911
  await new Promise((resolve) => {
    node2.on('ContentAdded', (key, contentType, content) => {
      if (contentType === 0) {
        const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(fromHexString(content)), {
          hardforkByBlockNumber: true,
        })
        if ('0x' + header.hash().toString('hex') === testHashStrings[25]) {
          t.pass('found expected last header')
          void node1.stop()
          void node2.stop()
          resolve(undefined)
        }
      }
    })
  })
})
