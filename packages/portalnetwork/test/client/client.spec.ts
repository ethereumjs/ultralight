import tape from 'tape'
import { PortalNetwork, ProtocolId } from '../../src/index.js'
import * as td from 'testdouble'
import { TransportLayer } from '../../src/client/index.js'

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

  t.test('test cleanup', (st) => {
    td.reset()
    node.stop()
    st.end()
  })

  t.end()
})
