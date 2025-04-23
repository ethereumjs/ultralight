import { readFileSync } from 'fs'
import { SignableENR } from '@chainsafe/enr'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, beforeAll, describe, it } from 'vitest'

import {
  ContentLookup,
  NetworkId,
  type PortalNetwork,
  TransportLayer,
  createPortalNetwork,
} from '../../src/index.js'

import type { ContentTrace, HistoryNetwork } from '../../src/index.js'

const pk1 = await keys.generateKeyPair('secp256k1')
const enr1 = SignableENR.createFromPrivateKey(pk1)
const pk2 = await keys.generateKeyPair('secp256k1')
const enr2 = SignableENR.createFromPrivateKey(pk2)
const pk3 = await keys.generateKeyPair('secp256k1')
const enr3 = SignableENR.createFromPrivateKey(pk3)
describe('Recursive Content Lookup Test', () => {
  let node1: PortalNetwork, node2: PortalNetwork, node3: PortalNetwork
  let network1: HistoryNetwork, network2: HistoryNetwork, network3: HistoryNetwork
  beforeAll(async () => {
    const initMa: any = multiaddr('/ip4/127.0.0.1/udp/5000')
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr('/ip4/127.0.0.1/udp/5001')
    enr2.setLocationMultiaddr(initMa2)
    const initMa3: any = multiaddr('/ip4/127.0.0.1/udp/5002')
    enr3.setLocationMultiaddr(initMa3)
    node1 = await createPortalNetwork({
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
    node2 = await createPortalNetwork({
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
    node3 = await createPortalNetwork({
      transport: TransportLayer.NODE,
      supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
      config: {
        enr: enr3,
        bindAddrs: {
          ip4: initMa3,
        },
        privateKey: pk3,
      },
    })

    await node1.start()
    await node2.start()
    await node3.start()

    network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    network3 = node3.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    await network1!.sendPing(node2.discv5.enr.toENR())
    await network2!.sendPing(node3.discv5.enr.toENR())
  })
  it('should retrieve the block from node1 via node3', async () => {
    const headersWithProofs: [string, string][] = JSON.parse(
      readFileSync('./test/testData/headersWithProofs.json', 'utf8'),
    )
    let contentKey: Uint8Array
    for (const [headerKey, headerWithProof] of headersWithProofs) {
      contentKey = hexToBytes(headerKey)
      await network1.store(contentKey, hexToBytes(headerWithProof))
      break
    }

    await network1!.sendPing(node2.discv5.enr.toENR())
    await network2!.sendPing(node3.discv5.enr.toENR())

    // Perform recursive content lookup from node3

    const contentLookup = new ContentLookup(network3, contentKey!, true)
    const res = (await contentLookup.startLookup()) as {
      content: Uint8Array
      trace: ContentTrace
    }

    assert.exists(res?.trace)
    assert.equal(bytesToHex(res?.content), headersWithProofs[0][1])
    assert.equal(res?.trace.receivedFrom, '0x' + node1.discv5.enr.nodeId)
  })
  it('should get no content and 2 nodes with trace info', async () => {
    const contentKey = hexToBytes(
      '0x00a6f23da625dc9c17792f4d8d8a6ee8b42274f73739768d50335db878ad54acd7',
    )
    const contentLookup = new ContentLookup(network3, contentKey, true)
    const res = await contentLookup.startLookup()
    assert.equal(Object.keys(res!.trace!.metadata!).length, 2)
  })
}, 30000)
