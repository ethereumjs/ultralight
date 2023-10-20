import { DEFAULT_PACKET_SIZE, MAX_CWND_INCREASE_PACKETS_PER_RTT } from '../index.js'
import { EventEmitter } from 'events'
import { Debugger } from 'debug'
import debug from 'debug'

const CCONTROL_TARGET = 100

export class CongestionControl extends EventEmitter {
  writing: boolean
  logger: Debugger
  rtt: number
  rtt_var: number
  timeout: number
  // eslint-disable-next-line no-undef
  timeoutCounter?: NodeJS.Timeout
  baseDelay: { delay: number; timestamp: number }
  ourDelay: number
  max_window: number
  cur_window: number
  reply_micro: number
  sendRate: number
  outBuffer: Map<number, number>

  constructor() {
    super()
    this.writing = false
    this.logger = debug('uTP:congestionControl')
    this.max_window = DEFAULT_PACKET_SIZE * 3
    this.cur_window = 0
    this.reply_micro = 0
    this.rtt = 1000
    this.rtt_var = 0
    this.timeout = 1000
    this.baseDelay = { delay: 0, timestamp: 0 }
    this.ourDelay = 0
    this.sendRate = 0
    this.outBuffer = new Map()
  }

  async canSend(): Promise<boolean> {
    if (this.cur_window + DEFAULT_PACKET_SIZE <= this.max_window) {
      return true
    } else {
      this.logger(` cur_window: ${this.cur_window} - max_window ${this.max_window}`)
      this.logger(`cur_window full.  waiting for in-flight packets to be acked`)
      return new Promise((resolve, reject) => {
        // Abort canSend promise if DATA packets not acked in a timely manner
        const abort = setTimeout(() => reject(false), 3000)
        this.once('canSend', () => {
          clearTimeout(abort)
          resolve(true)
        })
      })
    }
  }

  updateRTT(timestamp: number, ackNr: number): void {
    const sentTime = this.outBuffer.get(ackNr)
    if (!sentTime) {
      return
    }
    const packetRtt = timestamp - sentTime
    // Updates Round Trip Time (Time between sending DATA packet and receiving ACK packet)
    const delta = this.rtt - packetRtt
    this.rtt_var = this.rtt_var + Math.floor((Math.abs(delta) - this.rtt_var) / 4)
    this.rtt = Math.floor(this.rtt + (packetRtt - this.rtt) / 8)
    // 2147483647 is the highest signed 32 bit integer so this Math.min guards against timeout overflows
    this.timeout = Math.min(Math.max(this.rtt + this.rtt_var * 4, 500), 2147483647)
    clearTimeout(this.timeoutCounter)
    this.logger(`timeout set to ${this.timeout}ms`)
    this.timeoutCounter = setTimeout(() => {
      this.throttle()
    }, this.timeout)
    this.outBuffer.delete(ackNr)
  }

  throttle() {
    this.max_window = DEFAULT_PACKET_SIZE
    this.logger.extend('TIMEOUT')(`THROTTLE TRIGGERED after ${this.timeout}ms TIMEOUT`)
    clearTimeout(this.timeoutCounter)
    this.timeout = this.timeout * 2
    if (this.writing) {
      this.emit('write')
    } else {
      return
    }
    this.timeoutCounter = setTimeout(() => {
      this.throttle()
    }, this.timeout)
  }

  updateDelay(timestamp: number, timeReceived: number) {
    const delay = Math.abs(timeReceived - timestamp)
    this.reply_micro = delay
    this.ourDelay = delay - this.baseDelay.delay
    if (timeReceived - this.baseDelay.timestamp > 120000) {
      this.baseDelay = { delay: delay, timestamp: timeReceived }
    } else if (delay < this.baseDelay.delay) {
      this.baseDelay = { delay: delay, timestamp: timeReceived }
    }
    const offTarget = CCONTROL_TARGET - this.ourDelay
    const delayFactor = offTarget / CCONTROL_TARGET
    const windowFactor = this.cur_window / this.max_window
    const scaledGain = MAX_CWND_INCREASE_PACKETS_PER_RTT * delayFactor * windowFactor
    const new_max = this.max_window + scaledGain > 0 ? this.max_window + scaledGain : 0
    this.max_window = new_max
    /**
     * From BEP29 uTP spec
     * If max_window becomes less than 0, it is set to 0. A window size of zero means that
     * the socket may not send any packets. In this state, the socket will trigger a timeout
     * and force the window size to one packet size, and send one packet.
     * See the section on timeouts for more information.
     */
    if (this.max_window === 0) this.max_window = DEFAULT_PACKET_SIZE
  }
  updateWindow() {
    const inFlight = this.outBuffer.size
    this.cur_window = inFlight * DEFAULT_PACKET_SIZE
    this.logger(`cur_window: ${this.cur_window} bytes in flight`)
    if (this.cur_window + DEFAULT_PACKET_SIZE <= this.max_window) {
      this.emit('canSend')
    }
  }
}
