import tape from 'tape'
import { MessageCodes, PingPongCustomDataType, PortalNetwork, PortalWireMessageType, SubNetworkIds } from '../../src/'
import td from 'testdouble'
import { fromHexString } from '@chainsafe/ssz'

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
        st.plan(4)
        const findContentResponse = Uint8Array.from([5, 1, 97, 98, 99])
        td.when(node.sendPortalNetworkMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenResolve(findContentResponse)
        const res = await node.sendFindContent('abc', Uint8Array.from([1]), SubNetworkIds.HistoryNetwork)
        st.ok(Buffer.from(res).toString() === 'abc', 'received expected content from FINDCONTENT')

        const findContentMessageWithShortContent = Uint8Array.from([4, 4, 0, 0, 0, 1])
        const findContentMessageWithNoContent = Uint8Array.from([4, 4, 0, 0, 0, 6])
        const findContentMessageWithLongContent = Uint8Array.from([4, 4, 0, 0, 0, 3])
        td.when(node.client.sendTalkResp('def', td.matchers.anything(), td.matchers.argThat((arg: Buffer) => arg[1] === 1))).thenDo(() => st.pass('correctly handle findContent with small content request'))
        td.when(node.client.sendTalkResp('ghi', td.matchers.anything(), td.matchers.argThat((arg: Buffer) => arg.length === 0))).thenDo(() => st.pass('correctly handle findContent where no matching content'))
        td.when(node.client.sendTalkResp('jkl', td.matchers.anything(), td.matchers.argThat((arg: Buffer) => arg[1] === 0))).thenDo(() => st.pass('correctly handle findContent with large content request'))
        await node.handleFindContent('def', { protocol: fromHexString(SubNetworkIds.StateNetwork), request: findContentMessageWithShortContent })
        await node.handleFindContent('ghi', { protocol: fromHexString(SubNetworkIds.StateNetwork), request: findContentMessageWithNoContent })
        await node.handleFindContent('jkl', { protocol: fromHexString(SubNetworkIds.StateNetwork), request: findContentMessageWithLongContent })
    })

    t.test('OFFER/ACCEPT message handlers', async (st) => {
        st.plan(3)
        const acceptResponse = Uint8Array.from([7, 229, 229, 6, 0, 0, 0, 3])
        td.when(node.sendPortalNetworkMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenResolve(null, acceptResponse, null)
        let res = await node.sendOffer('abc', '', SubNetworkIds.HistoryNetwork)
        st.ok(res === undefined, 'received undefined when no valid ACCEPT message received')
        node.uTP.initiateUtpFromAccept = td.func<any>()
        td.when(node.uTP.initiateUtpFromAccept(td.matchers.contains('abc'), td.matchers.anything())).thenResolve(undefined)
        res = await node.sendOffer('abc', [Uint8Array.from([1])], SubNetworkIds.HistoryNetwork)
        st.ok(res[0] === true, 'received valid ACCEPT response to OFFER')
        res = await node.sendOffer('abc', [Uint8Array.from([0])], SubNetworkIds.HistoryNetwork)
        st.ok(res === undefined, 'received undefined when no valid ACCEPT message received')
    })

    td.reset();

    t.end()
})