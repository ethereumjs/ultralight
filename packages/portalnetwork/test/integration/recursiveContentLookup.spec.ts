import { SignableENR } from '@chainsafe/enr'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { readFileSync } from 'fs'
import { assert, describe, it } from 'vitest'

import { ContentLookup, NetworkId, PortalNetwork, TransportLayer } from '../../src/index.js'

import type { ContentTrace, HistoryNetwork } from '../../src/index.js'

const pk1 = await keys.generateKeyPair('secp256k1')
const enr1 = SignableENR.createFromPrivateKey(pk1)
const pk2 = await keys.generateKeyPair('secp256k1')
const enr2 = SignableENR.createFromPrivateKey(pk2)
const pk3 = await keys.generateKeyPair('secp256k1')
const enr3 = SignableENR.createFromPrivateKey(pk3)
describe('Recursive Content Lookup Test', () => {
  it('should retrieve the block from node1 via node3', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/5000`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/5001`)
    enr2.setLocationMultiaddr(initMa2)
    const initMa3: any = multiaddr(`/ip4/127.0.0.1/udp/5002`)
    enr3.setLocationMultiaddr(initMa3)
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
    const node3 = await PortalNetwork.create({
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

    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const network3 = node3.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

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
    assert.equal(res?.trace.receivedFrom, node1.discv5.enr.nodeId)
    await node1.stop()
    await node2.stop()
    await node3.stop()
  })
})
