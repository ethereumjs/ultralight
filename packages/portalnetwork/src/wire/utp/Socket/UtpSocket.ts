import { DELAY_TARGET, Packet, PacketType, DEFAULT_WINDOW_SIZE, ConnectionState } from '../index.js'
import EventEmitter from 'events'
import { ProtocolId, bitmap } from '../../../index.js'
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
  baseDelay: number
  ourDelay: number
  sendRate: number
  CCONTROL_TARGET: number
  writer: ContentWriter | undefined
  reader: ContentReader | undefined
  readerContent: Uint8Array | undefined
  dataNrs: number[]
  ackNrs: number[]
  received: number[]
  expected: number[]
  logger: Debugger
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
    this.max_window = DEFAULT_WINDOW_SIZE * 3
    this.cur_window = 0
    this.reply_micro = 0
    this.state = null
    this.rtt = 0
    this.rtt_var = 0
    this.baseDelay = 0
    this.ourDelay = 0
    this.sendRate = 0
    this.CCONTROL_TARGET = DELAY_TARGET
    this.readerContent = new Uint8Array()
    this.type = type
    this.dataNrs = []
    this.ackNrs = []
    this.received = []
    this.expected = []
    this.logger = logger.extend(this.remoteAddress.slice(0, 3)).extend(type)
  }

  // async updateSocketFromPacketHeader(packet: Packet) {
  //   this.updateRTT(packet.header.timestampDiff)
  //   this.cur_window = packet.header.wndSize
  // }

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
    this.ackNr++
  }

  async sendDataPacket(packet: Packet): Promise<Packet> {
    this.state = ConnectionState.Connected
    await this.sendPacket(packet, PacketType.ST_DATA)
    this.logger(
      `cur_window increasing from ${this.cur_window} to ${this.cur_window + DEFAULT_WINDOW_SIZE}`
    )
    this.cur_window = this.cur_window + DEFAULT_WINDOW_SIZE
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
      this.state = ConnectionState.Closed
      return true
    }
    if (this.type === 'read') {
      this.state = ConnectionState.Connected
      return await sendAckPacket(this)
    } else {
      this.state = ConnectionState.Connected
      if (packet.header.ackNr > 1 && !this.ackNrs.includes(packet.header.ackNr)) {
        this.ackNrs.push(packet.header.ackNr)
      }
      if (this.writer) {
        const inFlight = this.writer.sentChunks.filter((n) => !this.ackNrs.includes(n)).length
        this.cur_window = inFlight * DEFAULT_WINDOW_SIZE
        this.logger(`cur_window: ${this.cur_window} bytes in flight`)
      this.logger(
        `AckNr's needed: ${this.dataNrs.toString()} \n AckNr's received: ${this.ackNrs.toString()}`
      )
      }
      if (this.compare()) {
        this.logger(`all data packets acked`)
        return true
      } else {
        this.logger(`Still waiting for ${this.dataNrs.length - this.ackNrs.length} STATE packets.`)
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

  async handleDataPacket(packet: Packet): Promise<Packet> {
    this.state = ConnectionState.Connected
    const expected = this.ackNr + 1 === packet.header.seqNr
    this.seqNr = this.seqNr + 1
    if (!this.reader) {
      this.reader = new ContentReader(this, packet.header.seqNr)
    }
    this.ackNrs.push(packet.header.seqNr)
    await this.reader.addPacket(packet)
    if (expected) {
      this.ackNr = Math.max(...this.ackNrs)
      return await this.utp.sendStatePacket(this)
    } else {
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
    return this.readerContent
  }

  updateRTT(packetRTT: number): number {
    // Updates Round Trip Time (Time between sending DATA packet and receiving ACK packet)
    this.rtt_var += Math.abs(this.rtt - packetRTT - this.rtt_var) / 4
    this.rtt += (packetRTT - this.rtt) / 8
    return this.rtt
  }

  compare(): boolean {
    const sent = JSON.stringify(
      this.dataNrs.sort((a, b) => {
        return a - b
      })
    )
    const received = JSON.stringify(
      this.ackNrs.sort((a, b) => {
        return a - b
      })
    )
    const equal = sent === received
    return equal
  }
}
