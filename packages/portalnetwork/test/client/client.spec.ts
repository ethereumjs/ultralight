import tape from 'tape'
import {
  MessageCodes,
  PingPongCustomDataType,
  PortalNetwork,
  PortalWireMessageType,
  ProtocolId,
} from '../../src/'
import td from 'testdouble'
import { fromHexString } from '@chainsafe/ssz'
import { BlockHeader } from '@ethereumjs/block'
import {
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
} from '../../src/subprotocols/history/types'
import { ENR, serializedContentKeyToContentId } from '../../src/util'
import { Multiaddr } from 'multiaddr'
import { TransportLayer } from '../../src/client'
import { HistoryProtocol } from '../../src/subprotocols/history/history'
import { EntryStatus } from '@chainsafe/discv5'

tape('Client unit tests', async (t) => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })

  t.test('node initialization/startup', async (st) => {
    st.plan(2)
    st.equal(
      node.discv5.enr.getLocationMultiaddr('udp')!.toOptions().host,
      '192.168.0.1',
      'created portal network node with correct ip address'
    )

    node.discv5.start = td.func<any>()
    td.when(node.discv5.start()).thenResolve(st.pass('discv5 client started'))
    await node.start()
  })

  t.test('PING/PONG message handlers', async (st) => {
    st.plan(3)
    const protocol = new HistoryProtocol(node, 2n) as any
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
    st.ok(res === undefined, 'received undefined when no valid PONG message received')
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
    td.when(protocol.sendPong(nodeAddr, fromHexString(ProtocolId.HistoryNetwork))).thenDo(() =>
      st.pass('correctly handled PING message')
    )
    protocol.updateRoutingTable = td.func<any>()
    protocol.handlePing(nodeAddr, fromHexString(ProtocolId.HistoryNetwork), msg.value)
  })

  t.test('FINDNODES/NODES message handlers', async (st) => {
    st.plan(4)
    const protocol = new HistoryProtocol(node, 2n) as any
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
    let res = await protocol.sendFindNodes(decodedEnr.nodeId, [0, 1, 2], ProtocolId.HistoryNetwork)
    st.ok(res.total === 1, 'received 1 ENR from FINDNODES')
    res = await protocol.sendFindNodes(
      'c875efa288b97fce46c93adbeb05b25465acfe00121ec00f6db7f3bd883ac6f2',
      [],
      ProtocolId.HistoryNetwork
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

      fromHexString(ProtocolId.HistoryNetwork),
      findNodesMessageWithDistance
    )
    protocol.handleFindNodes(
      { socketAddr: new Multiaddr(), nodeId: 'abc' },

      fromHexString(ProtocolId.HistoryNetwork),
      findNodesMessageWithoutDistance
    )
  })

  t.test('FINDCONTENT/FOUNDCONTENT message handlers', async (st) => {
    st.plan(3)
    const protocol = new HistoryProtocol(node, 2n) as any
    const remoteEnr =
      'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
    const decodedEnr = ENR.decodeTxt(remoteEnr)
    protocol.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
    const key = HistoryNetworkContentKeyUnionType.serialize({
      selector: 1,
      value: {
        chainId: 1,
        blockHash: fromHexString(
          '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
        ),
      },
    })
    const findContentResponse = Uint8Array.from([5, 1, 97, 98, 99])
    protocol.addContentToHistory = td.func<any>()
    td.when(
      node.sendPortalNetworkMessage(
        td.matchers.anything(),
        td.matchers.anything(),
        td.matchers.anything()
      )
    ).thenResolve(Buffer.from(findContentResponse))
    const res = await protocol.sendFindContent(decodedEnr.nodeId, key)
    st.deepEqual(res.value, Buffer.from([97, 98, 99]), 'got correct response for content abc')
    const findContentMessageWithNoContent = { contentKey: Uint8Array.from([4, 4, 0, 0, 0, 6]) }
    const findContentMessageWithShortContent = {
      contentKey: Uint8Array.from([
        4, 4, 0, 0, 0, 0, 1, 0, 136, 233, 109, 69, 55, 190, 164, 217, 192, 93, 18, 84, 153, 7, 179,
        37, 97, 211, 191, 49, 244, 90, 174, 115, 76, 220, 17, 159, 19, 64, 108, 182,
      ]),
    }
    td.when(
      node.sendPortalNetworkResponse(
        { socketAddr: new Multiaddr(), nodeId: 'ghi' },
        td.matchers.anything(),
        td.matchers.argThat((arg: Uint8Array) => arg.length === 0)
      )
    ).thenDo(() => st.pass('got correct outcome for unsupported network'))

    td.when(
      node.sendPortalNetworkResponse(
        { socketAddr: new Multiaddr(), nodeId: 'def' },
        td.matchers.anything(),
        td.matchers.anything()
      )
    ).thenDo(() => st.pass('got correct content for def'))

    await protocol.handleFindContent(
      { socketAddr: new Multiaddr(), nodeId: 'ghi' },
      Buffer.from('0x123456'),
      fromHexString('0x123456'),
      findContentMessageWithNoContent
    )
    await protocol.handleFindContent(
      { socketAddr: new Multiaddr(), nodeId: 'def' },
      fromHexString(ProtocolId.HistoryNetwork),
      ProtocolId.HistoryNetwork,
      findContentMessageWithShortContent
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

  t.test('addContentToHistory handler', async (st) => {
    const node = await PortalNetwork.create({ transport: TransportLayer.WEB })
    const protocol = new HistoryProtocol(node, 2n) as any
    st.plan(1)
    const block1Rlp =
      '0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4'
    const block1Hash = '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
    await protocol.addContentToHistory(
      1,
      HistoryNetworkContentTypes.BlockHeader,
      block1Hash,
      fromHexString(block1Rlp)
    )
    const contentKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: HistoryNetworkContentTypes.BlockHeader,
      value: {
        chainId: 1,
        blockHash: fromHexString(block1Hash),
      },
    })

    const val = await node.db.get(serializedContentKeyToContentId(contentKey))
    const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(fromHexString(val)))
    st.ok(header.number.eqn(1), 'retrieved block header based on content key')
    st.end()
  })

  t.test('test cleanup', (st) => {
    td.reset()
    node.stop()
    st.end()
  })

  t.end()
})
