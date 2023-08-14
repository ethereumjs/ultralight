import debug from 'debug'
import tape from 'tape'

import { DEFAULT_PACKET_SIZE, PacketManager } from '../../../src/index.js'

const data = {
  rcvConnectionId: 1,
  sndConnectionId: 2,
  logger: debug('test'),
}

tape('PacketManager', async (t) => {
  t.test('class constructor', (st) => {
    const packetManager = new PacketManager(data.rcvConnectionId, data.sndConnectionId, data.logger)
    st.ok(packetManager, 'should create a PacketManager instance')
    st.ok(packetManager.congestionControl, 'should have a congestionControl instance')
    const ccAttr = {
      cur_window: packetManager.congestionControl.cur_window,
      max_window: packetManager.congestionControl.max_window,
      rtt: packetManager.congestionControl.rtt,
      rtt_var: packetManager.congestionControl.rtt_var,
      timout: packetManager.congestionControl.timeout,
      ourDelay: packetManager.congestionControl.ourDelay,
      sendRate: packetManager.congestionControl.sendRate,
      outBuffer: packetManager.congestionControl.outBuffer.size,
      writing: packetManager.congestionControl.writing,
    }
    st.deepEqual(
      ccAttr,
      {
        cur_window: 0,
        max_window: 3 * DEFAULT_PACKET_SIZE,
        rtt: 1000,
        rtt_var: 0,
        timout: 1000,
        ourDelay: 0,
        sendRate: 0,
        outBuffer: 0,
        writing: false,
      },
      'should initialize congestionControl attributes',
    )
    st.end()
  })

  t.end()
})
