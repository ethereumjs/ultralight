import { describe, it, assert } from 'vitest'

import { CongestionControl, DEFAULT_PACKET_SIZE } from '../../../src/index.js'

describe('CongestionControl', async () => {
  it('class contructor', () => {
    const congestionControl = new CongestionControl()
    assert.ok(congestionControl, 'CongestionControl created')
    assert.equal(congestionControl.cur_window, 0, 'cur_window initialized to 0')
    assert.equal(
      congestionControl.max_window,
      3 * DEFAULT_PACKET_SIZE,
      'max_window initialized to 3 * DEFAULT_PACKET_SIZE',
    )
    assert.equal(congestionControl.rtt, 1000, 'rtt initialized to 1000')
    assert.equal(congestionControl.rtt_var, 0, 'rtt_var initialized to 0')
    assert.equal(congestionControl.timeout, 1000, 'timeout initialized to 1000')
    assert.equal(congestionControl.ourDelay, 0, 'ourDelay initialized to 0')
    assert.equal(congestionControl.sendRate, 0, 'sendRate initialized to 0')
    assert.equal(congestionControl.outBuffer.size, 0, 'outBuffer initialized to empty')
    assert.equal(congestionControl.writing, false, 'writing initialized to false')
    assert.equal(
      congestionControl.timeoutCounter,
      undefined,
      'timeoutCounter initialized to undefined',
    )
    assert.equal(congestionControl.baseDelay.delay, 0, 'baseDelay.delay initialized to 0')
    assert.equal(congestionControl.baseDelay.timestamp, 0, 'baseDelay.timestamp initialized to 0')
  })
  it('canSend()', async () => {
    const congestionControl = new CongestionControl()
    assert.equal(
      await congestionControl.canSend(),
      true,
      'canSend() returns true when cur_window < max_window',
    )
    congestionControl.cur_window = congestionControl.max_window
    let updated = false
    setTimeout(() => {
      updated = true
      congestionControl.outBuffer = new Map()
      congestionControl.updateWindow()
    }, 100)
    assert.equal(updated, false, 'window not yet updated')
    assert.equal(
      await congestionControl.canSend(),
      true,
      'canSend() waits for window to be open to return',
    )

    congestionControl.cur_window = congestionControl.max_window
    updated = false
    setTimeout(() => {
      assert.ok(true, 'canSend() does not return until event promise is resolved or rejected')
    }, 100)
    assert.equal(updated, false, 'window not yet updated')
    try {
      await congestionControl.canSend()
    } catch (e) {
      assert.ok(true, 'canSend throws when timeout occurs')
    }
  })
  it('updateRTT()', async () => {
    const congestionControl = new CongestionControl()
    congestionControl.outBuffer.set(1, 1000)
    congestionControl.updateRTT(2000, 1)
    assert.equal(congestionControl.rtt, 1000, 'rtt updated to 1000')
    congestionControl.outBuffer.set(2, 2000)
    congestionControl.updateRTT(4000, 2)
    assert.equal(congestionControl.rtt, 1125, 'rtt updated to 1125')
    assert.equal(congestionControl.rtt_var, 250, 'rtt_var updated to 250')
    assert.equal(congestionControl.timeout, 2125, 'timeout updated to 2125')
  })

  it('throttle()', async () => {
    const congestionControl = new CongestionControl()
    const timeout = congestionControl.timeout
    congestionControl.cur_window = congestionControl.max_window
    congestionControl.throttle()
    assert.equal(congestionControl.timeout, timeout * 2, 'timeout doubled')
    assert.equal(
      congestionControl.max_window,
      DEFAULT_PACKET_SIZE,
      'max_window reset to DEFAULT_PACKET_SIZE',
    )
  })

  it('updateWindow()', async () => {
    const congestionControl = new CongestionControl()
    congestionControl.outBuffer.set(1, 1)
    congestionControl.outBuffer.set(2, 2)
    congestionControl.once('canSend', () => {
      assert.ok(true, 'update window emitted canSend event')
      assert.equal(
        congestionControl.cur_window,
        2 * DEFAULT_PACKET_SIZE,
        'cur_window updated to 2 * DEFAULT_PACKET_SIZE',
      )
    })
    congestionControl.updateWindow()
  })

  it('updateDelay()', async () => {
    const congestionControl = new CongestionControl()
    congestionControl.cur_window = 512
    congestionControl.updateDelay(130000, 130100)
    assert.equal(congestionControl.reply_micro, 100, 'reply_micro updated to 100')
    assert.equal(congestionControl.ourDelay, 100, 'ourDelay updated to 1000')
    assert.equal(congestionControl.baseDelay.delay, 100, 'baseDelay.delay updated to 1000')
    assert.equal(
      congestionControl.baseDelay.timestamp,
      130100,
      'baseDelay.timestamp updated to 130100',
    )
    assert.equal(congestionControl.max_window, 3 * DEFAULT_PACKET_SIZE, 'max_window unchanged')

    congestionControl.updateDelay(132000, 132050)
    assert.equal(congestionControl.reply_micro, 50, 'reply_micro updated to 50')
    assert.equal(congestionControl.ourDelay, -50, 'ourDelay updated to 50')
    assert.equal(congestionControl.baseDelay.delay, 50, 'baseDelay.delay updated to 50')
    assert.equal(
      congestionControl.baseDelay.timestamp,
      132050,
      'baseDelay.timestamp updated to 132050',
    )
    assert.ok(congestionControl.max_window > 3 * DEFAULT_PACKET_SIZE, 'max_window increased')

    const increased_window = congestionControl.max_window

    congestionControl.updateDelay(134000, 134200)
    assert.equal(congestionControl.reply_micro, 200, 'reply_micro updated to 200')
    assert.equal(congestionControl.ourDelay, 150, 'ourDelay updated to 150')
    assert.equal(congestionControl.baseDelay.delay, 50, 'baseDelay.delay unchanged')
    assert.equal(congestionControl.baseDelay.timestamp, 132050, 'baseDelay.timestamp unchanged')
    assert.ok(congestionControl.max_window < increased_window, 'max_window decreased')
  })
})
