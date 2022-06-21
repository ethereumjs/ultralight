import { ENR, EntryStatus } from '@chainsafe/discv5'
import { BlockHeader } from '@ethereumjs/block'
import * as tape from 'tape'
import * as td from 'testdouble'
import {
  fromHexString,
  PortalNetwork,
  ProtocolId,
  serializedContentKeyToContentId,
} from '../../../src'
import { TransportLayer } from '../../../src/client'
import { HistoryProtocol } from '../../../src/subprotocols/history/history'
import {
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
} from '../../../src/subprotocols/history/types'

tape('history Protocol message handler tests', async (t) => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })

  node.sendPortalNetworkMessage = td.func<any>()
  node.sendPortalNetworkResponse = td.func<any>()

  t.test('FINDCONTENT/FOUNDCONTENT message handlers', async (st) => {
    st.plan(1)
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

    // TODO: Write good `handleFindContent` tests
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
})
