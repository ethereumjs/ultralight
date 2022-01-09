import tape from 'tape'
import { MessageCodes, PingPongCustomDataType, PortalNetwork, PortalWireMessageType, SubNetworkIds } from '../../src/'
import td from 'testdouble'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { BlockHeader } from '@ethereumjs/block'
import { HistoryNetworkContentKeyUnionType, HistoryNetworkContentTypes } from '../../src/historySubnetwork/types'
import { getContentIdFromSerializedKey } from '../../src/historySubnetwork'

tape('Client unit tests', async (t) => {

    const node = await PortalNetwork.createPortalNetwork('192.168.0.1', 'ws://192.168.0.2:5050') as any

    t.test('node initialization/startup', async (st) => {
        st.plan(4)
        st.ok(node.client.enr.getLocationMultiaddr('udp')!.toString().includes('192.168.0.1'), 'created portal network node with correct ip address')

        node.client.start = td.func<any>()
        td.when(node.client.start()).thenResolve(undefined)
        await node.start();
        st.pass('client should start')

        st.throws(() => node.radius = 257, 'should not be able to set radius greater than 256')
        st.throws(() => node.radius = -1, 'radius cannot be negative');
    })

    t.test('PING/PONG message handlers', async (st) => {
        const pongResponse = Uint8Array.from([1, 5, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        node.sendPortalNetworkMessage = td.func<any>()
        td.when(node.sendPortalNetworkMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenResolve(pongResponse, null)
        let res = await node.sendPing('abc', SubNetworkIds.HistoryNetwork)
        st.ok(res.enrSeq === 5n && res.customPayload[0] === 1, 'received expected PONG response')
        res = await node.sendPing('abc', SubNetworkIds.HistoryNetwork)
        st.ok(res === undefined, 'received undefined when no valid PONG message received')

        node.sendPong = td.func<any>()
        td.when(node.sendPong('abc', td.matchers.anything())).thenDo(() => st.pass('correctly handled PING message'))
        node.updateSubnetworkRoutingTable = td.func<any>()
        const payload = PingPongCustomDataType.serialize({ radius: BigInt(1) })
        const pingMsg = PortalWireMessageType.serialize({
            selector: MessageCodes.PING, value: {
                enrSeq: node.client.enr.seq,
                customPayload: payload
            }
        })
        node.handlePing('abc', { request: pingMsg, protocol: SubNetworkIds.HistoryNetwork })
    })

    t.test('FINDNODES/NODES message handlers', async (st) => {
        st.plan(4)
        const findNodesResponse = Uint8Array.from([3, 1, 5, 0, 0, 0, 4, 0, 0, 0, 248, 132, 184, 64, 98, 28, 68, 73, 123, 43, 66, 88, 148, 220, 175, 197, 99, 155, 158, 245, 113, 112, 19, 145, 242, 62, 9, 177, 46, 127, 179, 172, 15, 214, 73, 120, 117, 10, 84, 236, 35, 36, 1, 7, 157, 133, 186, 53, 153, 250, 87, 144, 208, 228, 233, 233, 190, 215, 71, 114, 119, 169, 10, 2, 182, 117, 100, 246, 5, 130, 105, 100, 130, 118, 52, 130, 105, 112, 132, 127, 0, 0, 1, 137, 115, 101, 99, 112, 50, 53, 54, 107, 49, 161, 2, 166, 64, 119, 30, 57, 36, 215, 222, 189, 27, 126, 14, 93, 46, 164, 80, 142, 10, 84, 179, 46, 141, 1, 3, 181, 22, 178, 254, 0, 158, 156, 232, 131, 117, 100, 112, 130, 158, 250])
        td.when(node.sendPortalNetworkMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenResolve(findNodesResponse, null)
        let res = await node.sendFindNodes('abc', [0, 1, 2], SubNetworkIds.HistoryNetwork)
        st.ok(res.total === 1, 'received 1 ENR from FINDNODES')
        res = await node.sendFindNodes('abc', [], SubNetworkIds.HistoryNetwork)
        st.ok(res === undefined, 'received undefined when no valid NODES response received')

        node.client.sendTalkResp = td.func<any>()
        const findNodesMessageWithDistance = Uint8Array.from([2, 4, 0, 0, 0, 0, 0])
        const findNodesMessageWithoutDistance = Uint8Array.from([2, 4, 0, 0, 0])
        node.client.enr.encode = td.func<any>()
        td.when(node.client.sendTalkResp('abc', td.matchers.anything(), td.matchers.argThat((arg: Uint8Array) => arg.length > 3))).thenDo(() => st.pass('correctly handle findNodes message with ENRs'))
        td.when(node.client.sendTalkResp('abc', td.matchers.anything(), td.matchers.argThat((arg: Uint8Array) => arg.length === 0))).thenDo(() => st.pass('correctly handle findNodes message with no ENRs'))
        td.when(node.client.enr.encode()).thenReturn(Uint8Array.from([0, 1, 2]))
        node.handleFindNodes('abc', { request: findNodesMessageWithDistance, protocol: SubNetworkIds.HistoryNetwork })
        node.handleFindNodes('abc', { request: findNodesMessageWithoutDistance, protocol: SubNetworkIds.HistoryNetwork })
    })

    t.test('FINDCONTENT/FOUNDCONTENT message handlers', async (st) => {
        st.plan(3)
        const findContentResponse = Uint8Array.from([5, 1, 97, 98, 99])
        node.log = td.func<any>()
        td.when(node.log(td.matchers.contains('received content abc'))).thenDo(() => st.pass('received content!'))
        td.when(node.sendPortalNetworkMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenResolve(findContentResponse)
        const res = await node.sendFindContent('abc', Uint8Array.from([1]), SubNetworkIds.HistoryNetwork)

        const findContentMessageWithNoContent = Uint8Array.from([4, 4, 0, 0, 0, 6])
        const findContentMessageWithShortContent = Uint8Array.from([4, 4, 0, 0, 0, 0, 1, 0, 136, 233, 109, 69, 55, 190, 164, 217, 192, 93, 18, 84, 153, 7, 179, 37, 97, 211, 191, 49, 244, 90, 174, 115, 76, 220, 17, 159, 19, 64, 108, 182])
        td.when(node.client.sendTalkResp('ghi', td.matchers.anything(), td.matchers.argThat((arg: Buffer) => arg.length === 0))).thenDo(() => st.pass('correctly handle findContent where no matching content'))
        td.when(node.client.sendTalkResp('def', td.matchers.contains('12345'), td.matchers.anything())).thenDo(() => st.pass('got correct content'))
        await node.handleFindContent('ghi', { protocol: fromHexString(SubNetworkIds.StateNetwork), request: findContentMessageWithNoContent })
        await node.handleFindContent('def', { id: '12345', protocol: fromHexString(SubNetworkIds.HistoryNetwork), request: findContentMessageWithShortContent })
    })

    td.reset()
    t.test('OFFER/ACCEPT message handlers', async (st) => {
        st.plan(3)
        const acceptResponse = Uint8Array.from([7, 229, 229, 6, 0, 0, 0, 3])
        td.when(node.sendPortalNetworkMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenResolve([], acceptResponse, [])
        let res = await node.sendOffer('abc', '', SubNetworkIds.HistoryNetwork)
        st.ok(res === undefined, 'received undefined when no valid ACCEPT message received')
        node.uTP.initiateUtpFromAccept = td.func<any>()
        td.when(node.uTP.initiateUtpFromAccept(td.matchers.contains('abc'), td.matchers.anything())).thenResolve(undefined)
        res = await node.sendOffer('abc', [Uint8Array.from([1])], SubNetworkIds.HistoryNetwork)
        st.ok(res[0] === true, 'received valid ACCEPT response to OFFER')
        res = await node.sendOffer('abc', [Uint8Array.from([0])], SubNetworkIds.HistoryNetwork)
        st.ok(res === undefined, 'received undefined when no valid ACCEPT message received')
    })

    t.test('addContentToHistory handler', async (st) => {
        st.plan(1)
        const block1Rlp = "0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4"
        const block1Hash = "0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6"
        node.addContentToHistory(1, HistoryNetworkContentTypes.BlockHeader, block1Hash, block1Rlp)
        const contentKey = HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockHeader, value: {
                chainId: 1,
                blockHash: fromHexString(block1Hash)
            }
        })
        const val = await node.db.get(getContentIdFromSerializedKey(contentKey))
        const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(fromHexString(val)))
        st.ok(header.number.eqn(1), 'retrieved block header based on content key')
    })
    td.reset();
    await node.stop()
    t.end()
})