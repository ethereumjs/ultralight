import tape from 'tape'

import { CongestionControl, DEFAULT_PACKET_SIZE } from '../../../src/index.js'

tape('CongestionControl', async (t) => {
  t.test('class contructor', (st) => {
    const congestionControl = new CongestionControl()
    st.ok(congestionControl, 'CongestionControl created')
    st.equal(congestionControl.cur_window, 0, 'cur_window initialized to 0')
    st.equal(
      congestionControl.max_window,
      3 * DEFAULT_PACKET_SIZE,
      'max_window initialized to 3 * DEFAULT_PACKET_SIZE',
    )
    st.equal(congestionControl.rtt, 1000, 'rtt initialized to 1000')
    st.equal(congestionControl.rtt_var, 0, 'rtt_var initialized to 0')
    st.equal(congestionControl.timeout, 1000, 'timeout initialized to 1000')
    st.equal(congestionControl.ourDelay, 0, 'ourDelay initialized to 0')
    st.equal(congestionControl.sendRate, 0, 'sendRate initialized to 0')
    st.equal(congestionControl.outBuffer.size, 0, 'outBuffer initialized to empty')
    st.equal(congestionControl.writing, false, 'writing initialized to false')
    st.equal(congestionControl.timeoutCounter, undefined, 'timeoutCounter initialized to undefined')
    st.equal(congestionControl.baseDelay.delay, 0, 'baseDelay.delay initialized to 0')
    st.equal(congestionControl.baseDelay.timestamp, 0, 'baseDelay.timestamp initialized to 0')
    st.end()
  })
  t.test('canSend()', async (st) => {
    const congestionControl = new CongestionControl()
    st.equal(
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
    st.equal(updated, false, 'window not yet updated')
    st.equal(
      await congestionControl.canSend(),
      true,
      'canSend() waits for window to be open to return',
    )

    congestionControl.cur_window = congestionControl.max_window
    updated = false
    setTimeout(() => {
      st.pass('canSend() does not return until event promise is resolved or rejected')
    }, 100)
    st.equal(updated, false, 'window not yet updated')
    try {
      await congestionControl.canSend()
    } catch (e) {
      st.pass('canSend throws when timeout occurs')
    }
    st.end()
  })
  t.test('updateRTT()', async (st) => {
    const congestionControl = new CongestionControl()
    congestionControl.outBuffer.set(1, 1000)
    congestionControl.updateRTT(2000, 1)
    st.equal(congestionControl.rtt, 1000, 'rtt updated to 1000')
    congestionControl.outBuffer.set(2, 2000)
    congestionControl.updateRTT(4000, 2)
    st.equal(congestionControl.rtt, 1125, 'rtt updated to 1125')
    st.equal(congestionControl.rtt_var, 250, 'rtt_var updated to 250')
    st.equal(congestionControl.timeout, 2125, 'timeout updated to 2125')
    st.end()
  })

  t.test('throttle()', async (st) => {
    const congestionControl = new CongestionControl()
    const timeout = congestionControl.timeout
    congestionControl.cur_window = congestionControl.max_window
    congestionControl.throttle()
    st.equal(congestionControl.timeout, timeout * 2, 'timeout doubled')
    st.equal(
      congestionControl.max_window,
      DEFAULT_PACKET_SIZE,
      'max_window reset to DEFAULT_PACKET_SIZE',
    )
    st.end()
  })

  t.test('updateWindow()', async (st) => {
    const congestionControl = new CongestionControl()
    congestionControl.outBuffer.set(1, 1)
    congestionControl.outBuffer.set(2, 2)
    congestionControl.once('canSend', () => {
      st.pass('update window emitted canSend event')
      st.equal(
        congestionControl.cur_window,
        2 * DEFAULT_PACKET_SIZE,
        'cur_window updated to 2 * DEFAULT_PACKET_SIZE',
      )
      st.end()
    })
    congestionControl.updateWindow()
  })

  t.test('updateDelay()', async (st) => {
    const congestionControl = new CongestionControl()
    congestionControl.cur_window = 512
    congestionControl.updateDelay(130000, 130100)
    st.equal(congestionControl.reply_micro, 100, 'reply_micro updated to 100')
    st.equal(congestionControl.ourDelay, 100, 'ourDelay updated to 1000')
    st.equal(congestionControl.baseDelay.delay, 100, 'baseDelay.delay updated to 1000')
    st.equal(congestionControl.baseDelay.timestamp, 130100, 'baseDelay.timestamp updated to 130100')
    st.equal(congestionControl.max_window, 3 * DEFAULT_PACKET_SIZE, 'max_window unchanged')

    congestionControl.updateDelay(132000, 132050)
    st.equal(congestionControl.reply_micro, 50, 'reply_micro updated to 50')
    st.equal(congestionControl.ourDelay, -50, 'ourDelay updated to 50')
    st.equal(congestionControl.baseDelay.delay, 50, 'baseDelay.delay updated to 50')
    st.equal(congestionControl.baseDelay.timestamp, 132050, 'baseDelay.timestamp updated to 132050')
    st.ok(congestionControl.max_window > 3 * DEFAULT_PACKET_SIZE, 'max_window increased')

    const increased_window = congestionControl.max_window

    congestionControl.updateDelay(134000, 134200)
    st.equal(congestionControl.reply_micro, 200, 'reply_micro updated to 200')
    st.equal(congestionControl.ourDelay, 150, 'ourDelay updated to 150')
    st.equal(congestionControl.baseDelay.delay, 50, 'baseDelay.delay unchanged')
    st.equal(congestionControl.baseDelay.timestamp, 132050, 'baseDelay.timestamp unchanged')
    st.ok(congestionControl.max_window < increased_window, 'max_window decreased')

    st.end()
  })

  t.end()
})
