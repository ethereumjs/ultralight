import tape from 'tape'
import { PortalNetwork, SubNetworkIds } from '../../src/'
import td from 'testdouble'

tape('Client unit tests', async (t) => {
    const node = await PortalNetwork.createPortalNetwork('192.168.0.1', 'ws://192.168.0.2:5050') as any
    t.ok(node.client.enr.getLocationMultiaddr('udp')!.toString().includes('192.168.0.1'), 'created portal network node with correct ip address')

    node.client.start = td.func<any>()
    td.when(node.client.start()).thenResolve(undefined)
    await node.start();
    t.pass('client should start')

    t.throws(() => node.radius = 257, 'should not be able to set radius greater than 256')
    t.throws(() => node.radius = -1, 'radius cannot be negative');
    const pongResponse = Uint8Array.from([1, 5, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    node.sendPortalNetworkMessage = td.func<any>()
    td.when(node.sendPortalNetworkMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenResolve(pongResponse)
    const res = await node.sendPing('abc', SubNetworkIds.HistoryNetworkId)
    t.ok(res.enrSeq === 5n && res.customPayload[0] === 1, 'received expected PONG response')
    t.end()
})