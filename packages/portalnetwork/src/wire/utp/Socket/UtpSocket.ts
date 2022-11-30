import { Packet, PacketType, DEFAULT_PACKET_SIZE, ConnectionState } from '../index.js'
import EventEmitter from 'events'
import { ProtocolId, bitmap, MAX_CWND_INCREASE_PACKETS_PER_RTT } from '../../../index.js'
import { Debugger } from 'debug'
import ContentWriter from '../Protocol/write/ContentWriter.js'
import ContentReader from '../Protocol/read/ContentReader.js'
import { BasicUtp } from '../Protocol/BasicUtp.js'
import { sendAckPacket, sendSynAckPacket } from '../Packets/PacketSenders.js'
import { BitArray, BitVectorType } from '@chainsafe/ssz'

export class UtpSocket extends EventEmitter {
  type: 'read' | 'write'
  utp: BasicUtp
  content: Uint8Array
  remoteAddress: string
  seqNr: number
  ackNr: number
  finNr: number | undefined
  sndConnectionId: number
  rcvConnectionId: number
  state: ConnectionState | null
  max_window: number
  cur_window: number
  reply_micro: number
  rtt: number
  rtt_var: number
  timeout: number
  timeoutCounter?: NodeJS.Timeout
  baseDelay: { delay: number; timestamp: number }
  ourDelay: number
  sendRate: number
  writer: ContentWriter | undefined
  reader: ContentReader | undefined
  readerContent: Uint8Array | undefined
  dataNrs: number[]
  ackNrs: (number | undefined)[]
  received: number[]
  expected: number[]
  logger: Debugger
  outBuffer: Map<number, number>
  constructor(
    utp: BasicUtp,
    remoteAddress: string,
    sndId: number,
    rcvId: number,
    seqNr: number,
    ackNr: number,
    type: 'read' | 'write',
    logger: Debugger,
    content?: Uint8Array
  ) {
    super()
    this.content = content ? Uint8Array.from(content) : Uint8Array.from([])
    this.utp = utp
    this.remoteAddress = remoteAddress
    this.rcvConnectionId = rcvId
    this.sndConnectionId = sndId
    this.seqNr = seqNr
    this.ackNr = ackNr
    this.finNr = undefined
    this.max_window = DEFAULT_PACKET_SIZE * 3
    this.cur_window = 0
    this.reply_micro = 0
    this.state = null
    this.rtt = 1000
    this.rtt_var = 0
    this.timeout = 1000
    this.baseDelay = { delay: 0, timestamp: 0 }
    this.ourDelay = 0
    this.sendRate = 0
    this.readerContent = new Uint8Array()
    this.type = type
    this.dataNrs = []
    this.ackNrs = []
    this.received = []
    this.expected = []
    this.logger = logger.extend(this.remoteAddress.slice(0, 3)).extend(type)
    this.outBuffer = new Map()
  }

  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
    const msg = packet.encode()
    type !== PacketType.ST_DATA &&
      this.logger(
        `${PacketType[type]} packet sent. seqNr: ${packet.header.seqNr}  ackNr: ${packet.header.ackNr}`
      )
    this.utp.emit('Send', this.remoteAddress, msg, ProtocolId.HistoryNetwork, true)
    return msg
  }

  async sendSynPacket(packet: Packet): Promise<ConnectionState> {
    await this.sendPacket(packet, PacketType.ST_SYN)
    this.state = ConnectionState.SynSent
    return this.state
  }

  async sendSynAckPacket(packet: Packet): Promise<void> {
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async sendDataPacket(packet: Packet): Promise<Packet> {
    this.state = ConnectionState.Connected
    this.outBuffer.set(packet.header.seqNr, packet.header.timestampMicroseconds)
    this.cur_window = this.outBuffer.size * DEFAULT_PACKET_SIZE
    await this.sendPacket(packet, PacketType.ST_DATA)
    this.logger(
      `cur_window increasing from ${this.cur_window - DEFAULT_PACKET_SIZE} to ${this.cur_window}`
    )
    this.seqNr++
    return packet
  }

  async sendStatePacket(packet: Packet): Promise<void> {
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async sendResetPacket(packet: Packet) {
    this.state = ConnectionState.Reset
    await this.sendPacket(packet, PacketType.ST_RESET)
  }

  async sendFinPacket(packet: Packet): Promise<Buffer> {
    this.finNr = packet.header.seqNr
    return await this.sendPacket(packet, PacketType.ST_FIN)
  }

  async handleSynPacket(): Promise<Packet> {
    this.logger(`Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    return sendSynAckPacket(this)
  }

  async handleStatePacket(packet: Packet): Promise<void | boolean | Packet> {
    if (packet.header.ackNr === this.finNr) {
      this.logger(`FIN packet acked`)
      this.logger(`Closing Socket.  Goodnight.`)
      clearTimeout(this.timeoutCounter)
      this.state = ConnectionState.Closed
      return true
    }
    if (this.type === 'read') {
      this.state = ConnectionState.Connected
      return await sendAckPacket(this)
    } else {
      this.state = ConnectionState.Connected
      if (this.writer) {
        const inFlight = this.outBuffer.size
        this.cur_window = inFlight * DEFAULT_PACKET_SIZE
        const needed = this.dataNrs.filter((n) => !this.ackNrs.includes(n))
        this.logger(`cur_window: ${this.cur_window} bytes in flight`)
        this.logger(
          `AckNr's received (${this.ackNrs.length}/${
            this.writer.sentChunks.length
          }): ${this.ackNrs[0]?.toString()}...${
            this.ackNrs.slice(1).length > 3
              ? this.ackNrs.slice(this.ackNrs.length - 3)?.toString()
              : this.ackNrs.slice(1)?.toString()
          }`
        )
        this.logger(`AckNr's needed (${needed.length}/${
          Object.keys(this.writer.dataChunks).length
        }): ${needed.slice(0, 3)?.toString()}${
          needed.slice(3)?.length > 0 ? '...' + needed[needed.length - 1] : ''
        }
          `)
      }
      if (this.compare()) {
        this.logger(`all data packets acked`)
        return true
      } else {
        this.writer?.writing && this.writer?.start()
      }
    }
  }

  generateSelectiveAckBitMask(): Uint8Array {
    const window = new Array(32).fill(false)
    for (let i = 0; i < 32; i++) {
      if (this.ackNrs.includes(this.ackNr + 1 + i)) {
        window[bitmap[i] - 1] = true
      }
    }
    const bitMask = new BitVectorType(32).serialize(BitArray.fromBoolArray(window))
    return bitMask
  }

  async handleDataPacket(packet: Packet): Promise<Packet | undefined> {
    clearTimeout(this.timeoutCounter)
    this.state = ConnectionState.Connected
    let expected = true
    if (this.ackNrs.length > 1) {
      expected = this.ackNr + 1 === packet.header.seqNr
    }
    this.seqNr = this.seqNr + 1
    if (!this.reader) {
      this.reader = new ContentReader(this, packet.header.seqNr)
    }
    // Add the packet.seqNr to this.ackNrs at the relative index, regardless of order received.
    if (this.ackNrs[0] === undefined) {
      this.ackNrs[0] = packet.header.seqNr
    } else {
      this.ackNrs[packet.header.seqNr - this.ackNrs[0]] = packet.header.seqNr
    }
    await this.reader.addPacket(packet)
    if (expected) {
      // Update this.ackNr to last in-order seqNr received.
      const future = this.ackNrs.slice(packet.header.seqNr - this.ackNrs[0])
      this.ackNr = future.slice(future.findIndex((n, i, ackNrs) => ackNrs[i + 1] === undefined))[0]!
      // Send "Regular" ACK with the new this.ackNr
      return await this.utp.sendStatePacket(this)
    } else {
      // Do not increment this.ackNr
      // Send SELECTIVE_ACK with bitmask of received seqNrs > this.ackNr
      this.logger(`Packet has arrived out of order.  Replying with SELECTIVE ACK.`)
      const bitmask = this.generateSelectiveAckBitMask()
      return await this.utp.sendSelectiveAckPacket(this, bitmask)
    }
  }

  async handleFinPacket(packet: Packet): Promise<Uint8Array | undefined> {
    this.logger(`Connection State: GotFin`)
    this.state = ConnectionState.GotFin
    this.readerContent = await this.reader!.run()
    this.logger(`Packet payloads compiled`)
    this.logger(this.readerContent)
    this.seqNr = this.seqNr + 1
    this.ackNr = packet.header.seqNr
    await this.utp.sendStatePacket(this)
    clearTimeout(this.timeoutCounter)
    return this.readerContent
  }

  updateRTT(packetRTT: number): void {
    // Updates Round Trip Time (Time between sending DATA packet and receiving ACK packet)
    const delta = this.rtt - packetRTT
    this.logger.extend('RTT')(`
    socket.rtt: ${this.rtt}
    packetRTT: ${packetRTT}
    delta: ${delta}
    `)
    this.logger.extend('RTT')(`
    Updating socket.rtt_var and socket.rtt:
    socket.rtt_var: ${this.rtt_var} += abs(delta: ${delta}) - socket.rtt_var: ${
      this.rtt_var
    } / 4 = ${this.rtt_var + Math.abs(delta) - this.rtt_var / 4}
    socket.rtt: ${this.rtt} += (packetRTT: ${packetRTT} - socket.rtt: ${this.rtt}) / 8 = ${
      this.rtt + packetRTT - this.rtt / 8
    }
    `)
    this.rtt_var = this.rtt_var + (Math.abs(delta) - this.rtt_var) / 4
    this.rtt = Math.floor(this.rtt + (packetRTT - this.rtt) / 8)
    this.logger.extend('RTT')(
      `Updating Timeout:
     socket.timeout = this.rtt: ${this.rtt} + this.rtt_var: ${this.rtt_var} * 4 = ${
        this.rtt + this.rtt_var * 4
      }`
    )
    this.timeout = this.rtt + this.rtt_var * 4 > 500 ? this.rtt + this.rtt_var * 4 : 500
    this.logger.extend('TIMEOUT')(`Timeout reset to: ${this.timeout}`)
    clearTimeout(this.timeoutCounter)
    this.timeoutCounter = setTimeout(() => {
      this.throttle()
    }, this.timeout)
  }

  throttle() {
    this.max_window = DEFAULT_PACKET_SIZE
    this.logger.extend('TIMEOUT')(`THROTTLE TRIGGERED after ${this.timeout}ms TIMEOUT`)
    clearTimeout(this.timeoutCounter)
    this.timeout = this.timeout * 2
    if (this.writer?.writing) {
      this.writer?.start()
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
    this.logger.extend('DELAY')(
      `timeReceived: ${timeReceived} - timestamp: ${timestamp} = delay: ${delay}`
    )
    this.ourDelay = delay - this.baseDelay.delay
    if (timeReceived - this.baseDelay.timestamp > 120000) {
      this.baseDelay = { delay: delay, timestamp: timeReceived }
      this.logger.extend('DELAY')(`baseDelay reset to ${this.baseDelay.delay}`)
    } else if (delay < this.baseDelay.delay) {
      this.baseDelay = { delay: delay, timestamp: timeReceived }
      this.logger.extend('DELAY')(`baseDelay set to ${this.baseDelay.delay}`)
    }
    const offTarget = this.baseDelay.delay / this.ourDelay
    const delayFactor = offTarget / this.baseDelay.delay
    const windowFactor = this.cur_window / this.max_window
    const scaledGain = MAX_CWND_INCREASE_PACKETS_PER_RTT * delayFactor * windowFactor
    const new_max = this.max_window + scaledGain > 0 ? this.max_window + scaledGain : 0
    this.max_window = new_max
    this.logger.extend('DELAY')(`
    ourDelay: ${this.ourDelay}
    offTarget: ${offTarget}
    delayFactor: ${delayFactor}
    windowFactor: ${windowFactor}
    scaledGain: ${scaledGain}
    max_window ${
      new_max === 0
        ? 'Set to 0'
        : scaledGain > 0
        ? `increasing to ${new_max}`
        : scaledGain < 0
        ? `decreasing to ${new_max}`
        : `remaining at ${new_max}`
    }
    `)
  }

  compare(): boolean {
    if (this.ackNrs.includes(undefined)) {
      return false
    }
    const sent = JSON.stringify(
      this.dataNrs.sort((a, b) => {
        return a - b
      })
    )
    const received = JSON.stringify(
      this.ackNrs.sort((a, b) => {
        return a! - b!
      })
    )
    const equal = sent === received
    return equal
  }

  close(): void {
    clearInterval(this.timeoutCounter)
    this.logger.destroy()
    this.removeAllListeners()
  }
}
