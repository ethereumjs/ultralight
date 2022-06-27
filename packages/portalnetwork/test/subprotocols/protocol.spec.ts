import { EntryStatus } from '@chainsafe/discv5'
import { Multiaddr } from 'multiaddr'
import tape from 'tape'
import * as td from 'testdouble'
import {
  ENR,
  generateRandomNodeIdAtDistance,
  MessageCodes,
  NodesMessage,
  PingPongCustomDataType,
  PortalNetwork,
  PortalWireMessageType,
  ProtocolId,
} from '../../src'
import { TransportLayer } from '../../src/client'
import { HistoryProtocol } from '../../src/subprotocols/history/history'
import { BaseProtocol } from '../../src/subprotocols/protocol'
import { Debugger } from 'debug'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'

// Fake Protocol class for testing Protocol class
class FakeProtocol extends BaseProtocol {
  logger: Debugger
  protocolId: ProtocolId
  protocolName: string

  constructor(client: PortalNetwork, nodeRadius: bigint | undefined) {
    super(client, nodeRadius)
    this.protocolId = ProtocolId.HistoryNetwork
    this.protocolName = 'History Network'
    this.logger = client.logger.extend('fakeProtocol')
  }
  sendFindContent = td.func<any>()
  init = td.func<any>()
}

tape('protocol wire message tests', async (t) => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })

  t.test('PING/PONG message handlers', async (st) => {
    st.plan(3)
    const protocol = new FakeProtocol(node, 2n) as any

    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const pongResponse = Buffer.from([
      1, 5, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    node.sendPortalNetworkMessage = td.func<any>()
    td.when(
      node.sendPortalNetworkMessage(
        td.matchers.anything(),
        td.matchers.anything(),
        td.matchers.anything()
      )
    ).thenResolve(pongResponse)

    let res = await protocol.sendPing('abc')
    st.ok(res === undefined, 'received undefined when called with invalid ENR/nodeId')
    res = await protocol.sendPing(remoteEnr)
    st.ok(res.enrSeq === 5n && res.customPayload[0] === 1, 'received expected PONG response')
    const payload = PingPongCustomDataType.serialize({ radius: BigInt(1) })
    const msg = {
      selector: MessageCodes.PING,
      value: {
        enrSeq: node.discv5.enr.seq,
        customPayload: payload,
      },
    }
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    const nodeAddr = {
      socketAddr: decodedEnr.getLocationMultiaddr('udp'),
      nodeId: decodedEnr.nodeId,
    }
    protocol.sendPong = td.func<any>()
    td.when(protocol.sendPong(nodeAddr, 1n)).thenDo(() => st.pass('correctly handled PING message'))
    protocol.updateRoutingTable = td.func<any>()
    protocol.handlePing(nodeAddr, 1n, msg.value)
  })

  t.test('FINDNODES/NODES message handlers', async (st) => {
    st.plan(4)
    const protocol = new FakeProtocol(node, 2n) as any
    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    protocol.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
    const findNodesResponse = Buffer.from([
      3, 1, 5, 0, 0, 0, 4, 0, 0, 0, 248, 132, 184, 64, 98, 28, 68, 73, 123, 43, 66, 88, 148, 220,
      175, 197, 99, 155, 158, 245, 113, 112, 19, 145, 242, 62, 9, 177, 46, 127, 179, 172, 15, 214,
      73, 120, 117, 10, 84, 236, 35, 36, 1, 7, 157, 133, 186, 53, 153, 250, 87, 144, 208, 228, 233,
      233, 190, 215, 71, 114, 119, 169, 10, 2, 182, 117, 100, 246, 5, 130, 105, 100, 130, 118, 52,
      130, 105, 112, 132, 127, 0, 0, 1, 137, 115, 101, 99, 112, 50, 53, 54, 107, 49, 161, 2, 166,
      64, 119, 30, 57, 36, 215, 222, 189, 27, 126, 14, 93, 46, 164, 80, 142, 10, 84, 179, 46, 141,
      1, 3, 181, 22, 178, 254, 0, 158, 156, 232, 131, 117, 100, 112, 130, 158, 250,
    ])
    td.when(
      node.sendPortalNetworkMessage(
        td.matchers.anything(),
        td.matchers.anything(),
        td.matchers.anything()
      )
    ).thenResolve(findNodesResponse)
    let res = await protocol.sendFindNodes(decodedEnr.nodeId, [0, 1, 2])
    st.ok(res.total === 1, 'received 1 ENR from FINDNODES')
    res = await protocol.sendFindNodes(
      'c875efa288b97fce46c93adbeb05b25465acfe00121ec00f6db7f3bd883ac6f2',
      []
    )
    st.ok(res === undefined, 'received undefined when no valid NODES response received')

    node.sendPortalNetworkResponse = td.func<any>()
    const findNodesMessageWithDistance = { distances: [2, 4, 0, 0, 0, 0, 0] }
    const findNodesMessageWithoutDistance = { distances: [2, 4, 0, 0, 0] }
    node.discv5.enr.encode = td.func<any>()
    td.when(
      node.sendPortalNetworkResponse(
        { socketAddr: new Multiaddr(), nodeId: 'abc' },
        td.matchers.anything(),
        td.matchers.argThat((arg: Uint8Array) => arg.length > 3)
      )
    ).thenDo(() => st.pass('correctly handle findNodes message with ENRs'))
    td.when(
      node.sendPortalNetworkResponse(
        { socketAddr: new Multiaddr(), nodeId: 'abc' },
        td.matchers.anything(),
        td.matchers.argThat((arg: Uint8Array) => arg.length === 0)
      )
    ).thenDo(() => st.pass('correctly handle findNodes message with no ENRs'))
    td.when(node.discv5.enr.encode()).thenReturn(Buffer.from([0, 1, 2]))
    protocol.handleFindNodes(
      { socketAddr: new Multiaddr(), nodeId: 'abc' },
      1n,
      findNodesMessageWithDistance
    )
    protocol.handleFindNodes(
      { socketAddr: new Multiaddr(), nodeId: 'abc' },
      1n,
      findNodesMessageWithoutDistance
    )
  })

  td.reset()

  t.test('OFFER/ACCEPT message handlers', async (st) => {
    st.plan(3)
    const protocol = new HistoryProtocol(node, 2n) as any
    let res = await protocol.sendOffer(
      'c875efa288b97fce46c93adbeb05b25465acfe00121ec00f6db7f3bd883ac6f2',
      ''
    )
    st.equal(res, undefined, 'received undefined when no invalid ENR provided')

    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    protocol.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
    const acceptResponse = Uint8Array.from([7, 229, 229, 6, 0, 0, 0, 3])
    td.when(
      node.sendPortalNetworkMessage(
        td.matchers.anything(),
        td.matchers.anything(),
        td.matchers.anything()
      )
    ).thenResolve(Buffer.from(acceptResponse))

    node.uTP.handleNewRequest = td.func<any>()
    td.when(
      node.uTP.handleNewRequest(
        td.matchers.anything(),
        td.matchers.contains('abc'),
        td.matchers.anything(),
        td.matchers.anything()
      )
    ).thenResolve(undefined)
    res = await protocol.sendOffer(decodedEnr.nodeId, [Uint8Array.from([1])])
    st.deepEqual(res.uint8Array, Buffer.from([1]), 'received valid ACCEPT response to OFFER')

    const noWantResponse = Uint8Array.from([7, 229, 229, 6, 0, 0, 0, 0])
    td.when(
      node.sendPortalNetworkMessage(
        td.matchers.anything(),
        td.matchers.anything(),
        td.matchers.anything()
      )
    ).thenResolve(Buffer.from(noWantResponse))
    res = await protocol.sendOffer(decodedEnr.nodeId, [Uint8Array.from([0])])
    st.ok(res === undefined, 'received undefined when no valid ACCEPT message received')
  })
})

tape('handleFindNodes message handler tests', async (t) => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })

  type sendResponse = (src: INodeAddress, requestId: bigint, payload: Uint8Array) => Promise<void>
  node.sendPortalNetworkResponse = td.func<sendResponse>()

  const sortedEnrs: ENR[] = []
  const protocol = new FakeProtocol(node, 2n)

  for (let x = 239; x < 257; x++) {
    const id = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, x)
    const peerId = await createSecp256k1PeerId()
    //@ts-ignore
    const enr = ENR.createFromPeerId(peerId)
    enr.encode(Buffer.from(peerId.privateKey!))
    sortedEnrs.push(enr)
    ;(enr as any)._nodeId = id
    protocol.routingTable.insertOrUpdate(enr, EntryStatus.Connected)
  }
  const newNode = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, 0)
  await (protocol as any).handleFindNodes({ socketAddr: new Multiaddr(), nodeId: newNode }, 1n, {
    distances: [239],
  })

  td.verify(
    node.sendPortalNetworkResponse(
      { socketAddr: new Multiaddr(), nodeId: newNode },
      1n,
      td.matchers.argThat((arg: Uint8Array) => {
        const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
        return msg.enrs.length === 1
      })
    )
  )
  t.pass('Nodes response contained 1 ENR since should be nothing in table at distance 239')

  td.reset()

  node.sendPortalNetworkResponse = td.func<sendResponse>()
  await (protocol as any).handleFindNodes({ socketAddr: new Multiaddr(), nodeId: newNode }, 1n, {
    distances: [255, 256],
  })

  td.verify(
    node.sendPortalNetworkResponse(
      { socketAddr: new Multiaddr(), nodeId: newNode },
      1n,
      td.matchers.argThat((arg: Uint8Array) => {
        const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
        return msg.enrs.length === 2
      })
    )
  )
  t.pass('Nodes response contained 2 ENRs since should be one node in each bucket')
  td.reset()

  const id = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, 255)
  const peerId = await createSecp256k1PeerId() //@ts-ignore
  const enr = ENR.createFromPeerId(peerId)
  enr.encode(Buffer.from(peerId.privateKey!))
  ;(enr as any)._nodeId = id
  protocol.routingTable.insertOrUpdate(enr, EntryStatus.Connected)

  await (protocol as any).handleFindNodes({ socketAddr: new Multiaddr(), nodeId: newNode }, 1n, {
    distances: [255, 256],
  })

  td.verify(
    node.sendPortalNetworkResponse(
      { socketAddr: new Multiaddr(), nodeId: newNode },
      1n,
      td.matchers.argThat((arg: Uint8Array) => {
        const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
        return msg.enrs.length === 3
      })
    )
  )
  t.pass('Nodes response contained 3 ENRs since one more ENR added to bucket 256')
})
