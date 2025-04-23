import debug from 'debug'
import { assert, describe, it } from 'vitest'

import { DEFAULT_PACKET_SIZE, PacketManager } from '../../../src/index.js'

const data = {
  rcvConnectionId: 1,
  sndConnectionId: 2,
  logger: debug('test'),
}

describe('PacketManager', async () => {
  it('class constructor', () => {
    const packetManager = new PacketManager(data.rcvConnectionId, data.sndConnectionId, data.logger)
    assert.exists(packetManager, 'should create a PacketManager instance')
    assert.exists(packetManager.congestionControl, 'should have a congestionControl instance')
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
    assert.deepEqual(
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
  })
})
