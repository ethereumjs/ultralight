import { SignableENR } from '@chainsafe/enr'
import { Block, BlockHeader } from '@ethereumjs/block'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { EventEmitter } from 'events'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { assert, describe, it } from 'vitest'

import {
  BlockHeaderByNumberKey,
  BlockHeaderWithProof,
  HistoryNetworkContentType,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  addRLPSerializedBlock,
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
const witnesses: Uint8Array[] = JSON.parse(
  readFileSync('./test/testData/witnesses.json', 'utf8'),
).map(hexToBytes)

const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
const enr1 = SignableENR.createFromPrivateKey(pk1)
const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1]).slice(-36))
const enr2 = SignableENR.createFromPrivateKey(pk2)
describe('gossip test', async () => {
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/5000`)
  enr1.setLocationMultiaddr(initMa)
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
      privateKey: pk1,
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
      privateKey: pk2,
    },
  })

  await node1.start()
  await node2.start()
  const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  await network1?.sendPing(network2?.enr!.toENR())
  it('has pinged node in routing table', () => {
    assert.equal(
      network1?.routingTable.getWithPending(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      )?.value.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table',
    )
  })
  const headersWithProofs: [string, string][] = JSON.parse(
    readFileSync('./test/testData/headersWithProofs.json', 'utf8'),
  )
  for (const [headerKey, headerWithProof] of headersWithProofs) {
    await network1.store(hexToBytes(headerKey), hexToBytes(headerWithProof))
  }

  // Fancy workaround to allow us to "await" an event firing as expected following this - https://github.com/ljharb/tape/pull/503#issuecomment-619358911
  const end = new EventEmitter()
  const addedHeaders: [string, string][] = []
  network2.on('ContentAdded', async (key: Uint8Array, content: Uint8Array) => {
    network2.logger.extend('ContentAdded')(`Added Content for ${bytesToHex(key)}`)
    addedHeaders.push([bytesToHex(key), bytesToHex(content)])
    if (addedHeaders.length === headersWithProofs.length) {
      node2.removeAllListeners()
      void node1.stop()
      void node2.stop()
      end.emit('end()')
    }
  })
  const ended = await new Promise((resolve) => {
    end.once('end()', () => {
      resolve(true)
    })
  })
  it('should find all headers', () => {
    assert.isTrue(ended)
    assert.deepEqual(addedHeaders.sort(), headersWithProofs.sort(), 'added all headers')
  })
}, 40000)

describe('FindContent', async () => {
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3070`)
  enr1.setLocationMultiaddr(initMa)
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
      privateKey: pk1,
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
      privateKey: pk2,
    },
  })

  await node1.start()
  await node2.start()
  const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

  const witnesses: Uint8Array[] = JSON.parse(
    readFileSync('./test/testData/witnesses.json', 'utf8'),
  ).map(hexToBytes)
  await addRLPSerializedBlock(
    testBlockData[29].rlp,
    testBlockData[29].blockHash,
    network1,
    witnesses,
  )

  it('should have indexed block', () => {
    assert.isTrue(
      [...network1.blockHashIndex.keys()].includes('0x' + testBlockData[29].number.toString(16)),
      'block indexed',
    )
    assert.equal(
      bytesToHex(network1.blockNumberToHash(BigInt(testBlockData[29].number))!),
      testBlockData[29].blockHash,
    )
  })

  const byNumberKey = BlockHeaderByNumberKey(BigInt(testBlockData[29].number))
  const byHashKey = getContentKey(
    HistoryNetworkContentType.BlockHeader,
    hexToBytes(testBlockData[29].blockHash),
  )

  const byNumberLocal = await network1.findContentLocally(byNumberKey)

  it('should find local byNumber', () => {
    assert.isDefined(byNumberLocal, 'retrieved expected header')
  })

  const byHashLocal = await network1.findContentLocally(byHashKey)

  it('should find local byHash', () => {
    assert.isDefined(byHashLocal, 'retrieved expected header')
  })

  const byNumber = await node1.ETH.getBlockByNumber(BigInt(testBlockData[29].number), false)

  it('should find local with getBlockByNumber', () => {
    assert.equal(
      toHexString(byNumber!.hash()),
      testBlockData[29].blockHash,
      'retrieved expected header',
    )
  })

  const { stateRoot } = Block.fromRLPSerializedBlock(hexToBytes(testBlockData[29].rlp), {
    setHardfork: true,
  }).header
  const findStateRoot = await network1.getStateRoot(BigInt(testBlockData[29].number))

  it('should find state root by number', () => {
    assert.equal(bytesToHex(findStateRoot!), bytesToHex(stateRoot), 'retrieved expected state root')
  })

  await network1.sendPing(network2?.enr!.toENR())

  const res = await network2.sendFindContent(
    node1.discv5.enr.nodeId,
    getContentKey(HistoryNetworkContentType.BlockHeaderByNumber, BigInt(testBlockData[29].number)),
  )
  const headerWithProof = BlockHeaderWithProof.deserialize(res!['content'] as Uint8Array)
  const header = BlockHeader.fromRLPSerializedHeader(headerWithProof.header, {
    setHardfork: true,
  })

  node2.removeAllListeners()
  void node1.stop()
  void node2.stop()
  it('should find content', () => {
    assert.equal(
      toHexString(header.hash()),
      testBlockData[29].blockHash,
      'retrieved expected header',
    )
  })
})

describe('eth_getBlockByHash', async () => {
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3080`)
  enr1.setLocationMultiaddr(initMa)
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
      privateKey: pk1,
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
      privateKey: pk2,
    },
  })

  await node1.start()
  await node2.start()
  const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  await addRLPSerializedBlock(
    testBlockData[29].rlp,
    testBlockData[29].blockHash,
    network1,
    witnesses,
  )
  await network1.sendPing(network2?.enr!.toENR())

  const retrieved = await network2.portal.ETH.getBlockByHash(
    hexToBytes(testBlockData[29].blockHash),
    false,
  )

  void node1.stop()
  void node2.stop()
  it('should find content', () => {
    assert.equal(
      toHexString(retrieved!.hash()),
      testBlockData[29].blockHash,
      'retrieved expected header',
    )
  })
})
