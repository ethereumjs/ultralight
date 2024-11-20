import { EntryStatus } from '@chainsafe/discv5'
import { ENR, SignableENR } from '@chainsafe/enr'
import { hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { MemoryLevel } from 'memory-level'
import * as td from 'testdouble'
import { assert, describe, it } from 'vitest'

import {
  ContentRequest,
  MessageCodes,
  NetworkId,
  PingPongCustomDataType,
  PortalNetwork,
  PortalWireMessageType,
  TransportLayer,
  generateRandomNodeIdAtDistance,
} from '../../src/index.js'

import type { BitArray } from '@chainsafe/ssz'
import type { AbstractLevel } from 'abstract-level'
import type { BaseNetwork, HistoryNetwork, NodesMessage } from '../../src/index.js'

describe('network wire message tests', async () => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
  })
  const baseNetwork = node.networks.get(NetworkId.HistoryNetwork) as BaseNetwork
  it('BaseNetwork', async () => {
    baseNetwork.sendMessage = td.func<any>()
    td.when(
      baseNetwork.sendMessage(
        td.matchers.anything(),
        td.matchers.anything(),
        td.matchers.anything(),
      ),
    ).thenResolve(hexToBytes('0x1234'))
    const res = await baseNetwork.sendMessage('enr', new Uint8Array(), NetworkId.HistoryNetwork)
    assert.deepEqual(res, hexToBytes('0x1234'), 'sendMessage should return the response')
  })

  it('PING/PONG message handlers', async () => {
    const network = baseNetwork as any
    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    const pongResponse = Uint8Array.from([
      1, 5, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    network.sendMessage = td.func<any>()
    td.when(
      network.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
    ).thenResolve(pongResponse)
    const res = await network.sendPing(decodedEnr)
    assert.equal(res?.enrSeq, 5n, 'received expected PONG response')
    assert.equal(res?.customPayload[0], 1, 'received expected PONG response')
    const payload = PingPongCustomDataType.serialize({ radius: BigInt(1) })
    const msg = {
      selector: MessageCodes.PING,
      value: {
        enrSeq: node.discv5.enr.seq,
        customPayload: payload,
      },
    }
    const nodeAddr = {
      socketAddr: decodedEnr.getLocationMultiaddr('udp'),
      nodeId: decodedEnr.nodeId,
    }
    network.sendPong = td.func<any>()
    td.when(network.sendPong(nodeAddr, 1n)).thenDo(() =>
      assert.ok(true, 'correctly handled PING message'),
    )
    network.updateRoutingTable = td.func<any>()
    network.handlePing(nodeAddr, 1n, msg.value)
  })

  it('FINDNODES/NODES message handlers', async () => {
    const network = baseNetwork as any
    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    network.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
    const findNodesResponse = Uint8Array.from([
      3, 1, 5, 0, 0, 0, 4, 0, 0, 0, 248, 132, 184, 64, 98, 28, 68, 73, 123, 43, 66, 88, 148, 220,
      175, 197, 99, 155, 158, 245, 113, 112, 19, 145, 242, 62, 9, 177, 46, 127, 179, 172, 15, 214,
      73, 120, 117, 10, 84, 236, 35, 36, 1, 7, 157, 133, 186, 53, 153, 250, 87, 144, 208, 228, 233,
      233, 190, 215, 71, 114, 119, 169, 10, 2, 182, 117, 100, 246, 5, 130, 105, 100, 130, 118, 52,
      130, 105, 112, 132, 127, 0, 0, 1, 137, 115, 101, 99, 112, 50, 53, 54, 107, 49, 161, 2, 166,
      64, 119, 30, 57, 36, 215, 222, 189, 27, 126, 14, 93, 46, 164, 80, 142, 10, 84, 179, 46, 141,
      1, 3, 181, 22, 178, 254, 0, 158, 156, 232, 131, 117, 100, 112, 130, 158, 250,
    ])
    network.sendMessage = td.func<any>()
    td.when(
      network.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
    ).thenResolve(findNodesResponse)
    let res = await network.sendFindNodes(decodedEnr.nodeId, [0, 1, 2])
    assert.equal(res.total, 1, 'received 1 ENR from FINDNODES')
    res = await network.sendFindNodes(
      'c875efa288b97fce46c93adbeb05b25465acfe00121ec00f6db7f3bd883ac6f2',
      [],
    )
    assert.equal(res, undefined, 'received undefined when no valid NODES response received')

    network.sendResponse = td.func<any>()
    const findNodesMessageWithDistance = { distances: [2, 4, 0, 0, 0, 0, 0] }
    const findNodesMessageWithoutDistance = { distances: [2, 4, 0, 0, 0] }
    node.discv5.enr.encode = td.func<any>()
    td.when(
      network.sendResponse(
        { socketAddr: multiaddr(), nodeId: 'abc' },
        td.matchers.anything(),
        td.matchers.argThat((arg: Uint8Array) => arg.length > 3),
      ),
    ).thenDo(() => assert.ok(true, 'correctly handle findNodes message with ENRs'))
    td.when(
      network.sendResponse(
        { socketAddr: multiaddr(), nodeId: 'abc' },
        td.matchers.anything(),
        td.matchers.argThat((arg: Uint8Array) => arg.length === 0),
      ),
    ).thenDo(() => assert.ok(true, 'correctly handle findNodes message with no ENRs'))
    td.when(node.discv5.enr.encode()).thenReturn(Uint8Array.from([0, 1, 2]))
    network.handleFindNodes(
      { socketAddr: multiaddr(), nodeId: 'abc' },
      1n,
      findNodesMessageWithDistance,
    )
    network.handleFindNodes(
      { socketAddr: multiaddr(), nodeId: 'abc' },
      1n,
      findNodesMessageWithoutDistance,
    )
  })

  td.reset()

  it('OFFER/ACCEPT message handlers', async () => {
    const network = baseNetwork as any
    let res = await network.sendOffer(
      'c875efa288b97fce46c93adbeb05b25465acfe00121ec00f6db7f3bd883ac6f2',
      [],
    )
    assert.equal(res, undefined, 'received undefined when no invalid ENR provided')

    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    network.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
    network.sendMessage = td.func<any>()
    const acceptResponse = Uint8Array.from([7, 229, 229, 6, 0, 0, 0, 3])
    td.when(
      network.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
    ).thenResolve(acceptResponse)

    network.handleNewRequest = td.func<any>()
    td.when(
      network.handleNewRequest({
        contentKeys: td.matchers.anything(),
        peerId: td.matchers.contains('abc'),
        connectionId: td.matchers.anything(),
        contents: td.matchers.anything(),
      }),
    ).thenResolve(ContentRequest.prototype)
    res = await network.sendOffer(decodedEnr.nodeId, [Uint8Array.from([1])])
    assert.deepEqual(
      (res as BitArray).uint8Array,
      Uint8Array.from([1]),
      'received valid ACCEPT response to OFFER',
    )

    const noWantResponse = Uint8Array.from([7, 229, 229, 6, 0, 0, 0, 0])
    td.when(
      network.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
    ).thenResolve(noWantResponse)
    res = await network.sendOffer(decodedEnr.nodeId, [Uint8Array.from([0])])
    assert.equal(res, undefined, 'received undefined when no valid ACCEPT message received')
  })
})
describe('handleFindNodes message handler tests', async () => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
  })
  const network = node.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  type sendResponse = (src: any, requestId: bigint, payload: Uint8Array) => Promise<void>
  network.sendResponse = td.func<sendResponse>()

  const sortedEnrs: ENR[] = []

  it('test FindNodes', async () => {
    for (let x = 239; x < 257; x++) {
      const id = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, x)
      const privKey = await keys.generateKeyPair('secp256k1')
      const enr = SignableENR.createFromPrivateKey(privKey)
      const remoteEnr = enr.toENR()
      ;(remoteEnr as any).nodeId = id
      sortedEnrs.push(remoteEnr)

      network.routingTable.insertOrUpdate(remoteEnr, EntryStatus.Connected)
    }
    const newNode = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, 0)
    await (network as any).handleFindNodes({ socketAddr: multiaddr(), nodeId: newNode }, 1n, {
      distances: [239],
    })
    td.verify(
      network.sendResponse(
        { socketAddr: multiaddr(), nodeId: newNode },
        1n,
        td.matchers.argThat((arg: Uint8Array) => {
          const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
          return msg.enrs.length === 1
        }),
      ),
    )
    assert.ok(
      true,
      'Nodes response contained no ENRs since should be nothing in table at distance 239',
    )

    td.reset()

    network.sendResponse = td.func<sendResponse>()
    await (network as any).handleFindNodes({ socketAddr: multiaddr(), nodeId: newNode }, 1n, {
      distances: [255, 256],
    })

    td.verify(
      network.sendResponse(
        { socketAddr: multiaddr(), nodeId: newNode },
        1n,
        td.matchers.argThat((arg: Uint8Array) => {
          const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
          return msg.enrs.length === 2
        }),
      ),
    )
    assert.ok(true, 'Nodes response contained 2 ENRs since should be one node in each bucket')
    td.reset()

    const id = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, 255)
    const privKey = await keys.generateKeyPair('secp256k1')
    const enr = SignableENR.createFromPrivateKey(privKey)
    enr.encode()
    ;(enr as any)._nodeId = id
    network.routingTable.insertOrUpdate(enr.toENR(), EntryStatus.Connected)

    await (network as any).handleFindNodes({ socketAddr: multiaddr(), nodeId: newNode }, 1n, {
      distances: [255, 256],
    })

    td.verify(
      network.sendResponse(
        { socketAddr: multiaddr(), nodeId: newNode },
        1n,
        td.matchers.argThat((arg: Uint8Array) => {
          const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
          return msg.enrs.length > 0
        }),
      ),
    )
    assert.ok(true, 'Nodes response contained 3 ENRs since one more ENR added to bucket 256')

    await (network as any).handleFindNodes({ socketAddr: multiaddr(), nodeId: newNode }, 1n, {
      distances: [239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 255, 256],
    })

    td.verify(
      network.sendResponse(
        { socketAddr: multiaddr(), nodeId: newNode },
        1n,
        td.matchers.argThat((arg: Uint8Array) => {
          const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
          return msg.enrs.length === 10
        }),
      ),
    )
    assert.ok(
      true,
      'Nodes response contained 10 ENRs even though requested nodes in 12 buckets since nodes max payload size met',
    )
  })
})

describe('stored radius', async () => {
  const r = 2n ** 254n - 1n
  const db = new MemoryLevel<string, string>()
  await db.put('radius', r.toString())
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedNetworks: [
      {
        networkId: NetworkId.HistoryNetwork,
        db: { db: db as AbstractLevel<string, string>, path: '' },
      },
    ],
  })
  const history = node.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const radius = history.nodeRadius
  it('should have correct radius', () => {
    assert.equal(radius, r, 'correct radius')
  })
})
