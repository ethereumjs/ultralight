import { ENR, EntryStatus, SignableENR } from '@chainsafe/discv5'
import { multiaddr } from '@multiformats/multiaddr'
import tape from 'tape'
import * as td from 'testdouble'
import {
  generateRandomNodeIdAtDistance,
  MessageCodes,
  NodesMessage,
  PingPongCustomDataType,
  PortalNetwork,
  PortalWireMessageType,
  ProtocolId,
  TransportLayer,
  BaseProtocol,
  ContentRequest,
  HistoryProtocol,
} from '../../src/index.js'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo.js'
import { BitArray, fromHexString, toHexString } from '@chainsafe/ssz'

tape('protocol wire message tests', async (t) => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })
  const baseProtocol = node.protocols.get(ProtocolId.HistoryNetwork) as BaseProtocol
  t.test('BaseProtocol', async (st) => {
    baseProtocol.sendMessage = td.func<any>()
    td.when(
      baseProtocol.sendMessage(
        td.matchers.anything(),
        td.matchers.anything(),
        td.matchers.anything(),
      ),
    ).thenResolve(fromHexString('0x1234'))
    const res = await baseProtocol.sendMessage('enr', new Uint8Array(), ProtocolId.HistoryNetwork)
    st.deepEqual(res, fromHexString('0x1234'), 'sendMessage should return the response')
    st.end()
  })

  t.test('PING/PONG message handlers', async (st) => {
    st.plan(3)
    const protocol = baseProtocol as any
    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    const pongResponse = Uint8Array.from([
      1, 5, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    protocol.sendMessage = td.func<any>()
    td.when(
      protocol.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
    ).thenResolve(pongResponse)
    const res = await protocol.sendPing(decodedEnr)
    st.equal(res?.enrSeq, 5n, 'received expected PONG response')
    st.equal(res?.customPayload[0], 1, 'received expected PONG response')
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
    protocol.sendPong = td.func<any>()
    td.when(protocol.sendPong(nodeAddr, 1n)).thenDo(() => st.pass('correctly handled PING message'))
    protocol.updateRoutingTable = td.func<any>()
    protocol.handlePing(nodeAddr, 1n, msg.value)
  })

  t.test('FINDNODES/NODES message handlers', async (st) => {
    const protocol = baseProtocol as any
    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    protocol.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
    const findNodesResponse = Uint8Array.from([
      3, 1, 5, 0, 0, 0, 4, 0, 0, 0, 248, 132, 184, 64, 98, 28, 68, 73, 123, 43, 66, 88, 148, 220,
      175, 197, 99, 155, 158, 245, 113, 112, 19, 145, 242, 62, 9, 177, 46, 127, 179, 172, 15, 214,
      73, 120, 117, 10, 84, 236, 35, 36, 1, 7, 157, 133, 186, 53, 153, 250, 87, 144, 208, 228, 233,
      233, 190, 215, 71, 114, 119, 169, 10, 2, 182, 117, 100, 246, 5, 130, 105, 100, 130, 118, 52,
      130, 105, 112, 132, 127, 0, 0, 1, 137, 115, 101, 99, 112, 50, 53, 54, 107, 49, 161, 2, 166,
      64, 119, 30, 57, 36, 215, 222, 189, 27, 126, 14, 93, 46, 164, 80, 142, 10, 84, 179, 46, 141,
      1, 3, 181, 22, 178, 254, 0, 158, 156, 232, 131, 117, 100, 112, 130, 158, 250,
    ])
    protocol.sendMessage = td.func<any>()
    td.when(
      protocol.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
    ).thenResolve(findNodesResponse)
    let res = await protocol.sendFindNodes(decodedEnr.nodeId, [0, 1, 2])
    st.equals(res.total, 1, 'received 1 ENR from FINDNODES')
    res = await protocol.sendFindNodes(
      'c875efa288b97fce46c93adbeb05b25465acfe00121ec00f6db7f3bd883ac6f2',
      [],
    )
    st.equals(res, undefined, 'received undefined when no valid NODES response received')

    protocol.sendResponse = td.func<any>()
    const findNodesMessageWithDistance = { distances: [2, 4, 0, 0, 0, 0, 0] }
    const findNodesMessageWithoutDistance = { distances: [2, 4, 0, 0, 0] }
    node.discv5.enr.encode = td.func<any>()
    td.when(
      protocol.sendResponse(
        { socketAddr: multiaddr(), nodeId: 'abc' },
        td.matchers.anything(),
        td.matchers.argThat((arg: Uint8Array) => arg.length > 3),
      ),
    ).thenDo(() => st.pass('correctly handle findNodes message with ENRs'))
    td.when(
      protocol.sendResponse(
        { socketAddr: multiaddr(), nodeId: 'abc' },
        td.matchers.anything(),
        td.matchers.argThat((arg: Uint8Array) => arg.length === 0),
      ),
    ).thenDo(() => st.pass('correctly handle findNodes message with no ENRs'))
    td.when(node.discv5.enr.encode()).thenReturn(Uint8Array.from([0, 1, 2]))
    protocol.handleFindNodes(
      { socketAddr: multiaddr(), nodeId: 'abc' },
      1n,
      findNodesMessageWithDistance,
    )
    protocol.handleFindNodes(
      { socketAddr: multiaddr(), nodeId: 'abc' },
      1n,
      findNodesMessageWithoutDistance,
    )
  })

  td.reset()

  t.test('OFFER/ACCEPT message handlers', async (st) => {
    const protocol = baseProtocol as any
    let res = await protocol.sendOffer(
      'c875efa288b97fce46c93adbeb05b25465acfe00121ec00f6db7f3bd883ac6f2',
      [],
    )
    st.equal(res, undefined, 'received undefined when no invalid ENR provided')

    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    protocol.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
    protocol.sendMessage = td.func<any>()
    const acceptResponse = Uint8Array.from([7, 229, 229, 6, 0, 0, 0, 3])
    td.when(
      protocol.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
    ).thenResolve(acceptResponse)

    protocol.handleNewRequest = td.func<any>()
    td.when(
      protocol.handleNewRequest({
        contentKeys: td.matchers.anything(),
        peerId: td.matchers.contains('abc'),
        connectionId: td.matchers.anything(),
        contents: td.matchers.anything(),
      }),
    ).thenResolve(ContentRequest.prototype)
    res = await protocol.sendOffer(decodedEnr.nodeId, [Uint8Array.from([1])])
    st.deepEqual(
      (res as BitArray).uint8Array,
      Uint8Array.from([1]),
      'received valid ACCEPT response to OFFER',
    )

    const noWantResponse = Uint8Array.from([7, 229, 229, 6, 0, 0, 0, 0])
    td.when(
      protocol.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
    ).thenResolve(noWantResponse)
    res = await protocol.sendOffer(decodedEnr.nodeId, [Uint8Array.from([0])])
    st.equals(res, undefined, 'received undefined when no valid ACCEPT message received')
  })
})
tape('handleFindNodes message handler tests', async (st) => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })
  const protocol = node.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  type sendResponse = (src: INodeAddress, requestId: bigint, payload: Uint8Array) => Promise<void>
  protocol.sendResponse = td.func<sendResponse>()

  const sortedEnrs: ENR[] = []

  for (let x = 239; x < 257; x++) {
    const id = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, x)
    const peerId = await createSecp256k1PeerId()
    const enr = SignableENR.createFromPeerId(peerId)
    const remoteEnr = enr.toENR()
    remoteEnr.nodeId = id
    sortedEnrs.push(remoteEnr)
    protocol.routingTable.insertOrUpdate(remoteEnr, EntryStatus.Connected)
  }
  const newNode = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, 240)
  await (protocol as any).handleFindNodes({ socketAddr: multiaddr(), nodeId: newNode }, 1n, {
    distances: [241],
  })

  td.verify(
    protocol.sendResponse(
      { socketAddr: multiaddr(), nodeId: newNode },
      1n,
      td.matchers.argThat((arg: Uint8Array) => {
        const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
        return msg.enrs.length === 1
      }),
    ),
  )
  st.pass('Nodes response contained no ENRs since should be nothing in table at distance 239')

  td.reset()

  protocol.sendResponse = td.func<sendResponse>()
  await (protocol as any).handleFindNodes({ socketAddr: multiaddr(), nodeId: newNode }, 1n, {
    distances: [255, 256],
  })

  td.verify(
    protocol.sendResponse(
      { socketAddr: multiaddr(), nodeId: newNode },
      1n,
      td.matchers.argThat((arg: Uint8Array) => {
        const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
        return msg.enrs.length === 2
      }),
    ),
  )
  st.pass('Nodes response contained 2 ENRs since should be one node in each bucket')
  td.reset()

  const id = generateRandomNodeIdAtDistance(node.discv5.enr.nodeId, 255)
  const peerId = await createSecp256k1PeerId()
  const enr = SignableENR.createFromPeerId(peerId)
  enr.encode()
  ;(enr as any)._nodeId = id
  protocol.routingTable.insertOrUpdate(enr.toENR(), EntryStatus.Connected)

  await (protocol as any).handleFindNodes({ socketAddr: multiaddr(), nodeId: newNode }, 1n, {
    distances: [255, 256],
  })

  td.verify(
    protocol.sendResponse(
      { socketAddr: multiaddr(), nodeId: newNode },
      1n,
      td.matchers.argThat((arg: Uint8Array) => {
        const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
        return msg.enrs.length === 3
      }),
    ),
  )
  st.pass('Nodes response contained 3 ENRs since one more ENR added to bucket 256')

  await (protocol as any).handleFindNodes({ socketAddr: multiaddr(), nodeId: newNode }, 1n, {
    distances: [239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 255, 256],
  })

  td.verify(
    protocol.sendResponse(
      { socketAddr: multiaddr(), nodeId: newNode },
      1n,
      td.matchers.argThat((arg: Uint8Array) => {
        const msg = PortalWireMessageType.deserialize(arg).value as NodesMessage
        return msg.enrs.length === 10
      }),
    ),
  )
  st.pass(
    'Nodes response contained 10 ENRs even though requested nodes in 12 buckets since nodes max payload size met',
  )
})
