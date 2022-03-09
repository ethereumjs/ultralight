import { DELAY_TARGET, Packet, PacketType, DEFAULT_WINDOW_SIZE } from '..'
import { ConnectionState } from '.'

import EventEmitter from 'events'
import { SubNetworkIds } from '../..'
import { Debugger } from 'debug'
import ContentWriter from '../Protocol/write/ContentWriter'
import ContentReader from '../Protocol/read/ContentReader'
import { BasicUtp } from '../Protocol/BasicUtp'
import { sendAckPacket, sendSynAckPacket } from '../Packets/PacketSenders'
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
  nextSeq: number | undefined
  nextAck: number | undefined
  logger: Debugger
  constructor(
    utp: BasicUtp,
    remoteAddress: string,
    sndId: number,
    rcvId: number,
    seqNr: number,
    ackNr: number,
    nextSeq: number | undefined,
    nextAck: number | undefined,
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
    this.max_window = DEFAULT_WINDOW_SIZE
    this.cur_window = this.max_window
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
    this.nextSeq = nextSeq
    this.nextAck = nextAck
    this.logger = logger.extend(this.remoteAddress.slice(0, 3)).extend(type)
  }

  // async updateSocketFromPacketHeader(packet: Packet) {
  //   this.updateRTT(packet.header.timestampDiff)
  //   this.cur_window = packet.header.wndSize
  // }

  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
    const msg = packet.encodePacket()
    this.logger(
      `${PacketType[type]} packet sent. seqNr: ${packet.header.seqNr}  ackNr: ${packet.header.ackNr}`
    )
    await this.utp.send(this.remoteAddress, msg, SubNetworkIds.HistoryNetwork)
    return msg
  }

  async sendSynPacket(packet: Packet): Promise<void> {
    await this.sendPacket(packet, PacketType.ST_SYN)
  }

  async sendSynAckPacket(packet: Packet): Promise<void> {
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async sendDataPacket(packet: Packet): Promise<number> {
    await this.sendPacket(packet, PacketType.ST_DATA)
    return packet.header.seqNr
  }

  async sendStatePacket(packet: Packet): Promise<void> {
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async sendResetPacket(packet: Packet) {
    await this.sendPacket(packet, PacketType.ST_RESET)
  }

  async sendFinPacket(packet: Packet) {
    await this.sendPacket(packet, PacketType.ST_FIN)
  }

  async handleSynPacket(): Promise<void> {
    this.logger(`Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    await sendSynAckPacket(this)
  }

  async handleStatePacket(packet: Packet): Promise<void | boolean> {
    const nextSeq = this.nextSeq === undefined ? 'RANDOM' : this.nextSeq
    const nextAck = this.nextSeq === undefined ? 'RANDOM' : this.nextSeq
    this.logger(
      `expecting ${nextSeq}-${nextAck}.  got ${packet.header.seqNr}-${packet.header.ackNr}`
    )
    this.nextAck = this.nextAck && packet.header.ackNr + 1
    this.nextSeq = this.nextSeq && packet.header.seqNr + 1
    if (this.type === 'read') {
      await sendAckPacket(this)
    } else {
      this.ackNrs.push(packet.header.ackNr)
      const finished = this.dataNrs.every((val, index) => val === this.ackNrs[index])
      if (finished) {
        this.logger(
          `AckNr's needed: ${this.dataNrs.toString()} \n AckNr's received: ${this.ackNrs.toString()}`
        )
      }
      if (this.compare()) {
        this.logger(`all data packets acked`)
        return true
        // this.utp.sendFinPacket(this)
      } else {
        this.logger(`Still waiting for ${this.dataNrs.length - this.ackNrs.length} STATE packets.`)
      }
    }
  }

  async handleDataPacket(packet: Packet): Promise<void> {
    this.logger(
      `expecting ${this.nextSeq}-${this.nextAck}.  got ${packet.header.seqNr}-${packet.header.ackNr}`
    )
    this.nextSeq = packet.header.seqNr + 1
    this.nextAck = packet.header.ackNr + 1
    this.seqNr = packet.header.ackNr + 1
    this.ackNr = packet.header.seqNr
    // this.updateSocketFromPacketHeader(packet)
    try {
      const expected = await this.reader!.addPacket(packet)
      if (expected === true) {
        this.ackNrs.push(this.seqNr)
        await this.utp.sendStatePacket(this)
      } else if (expected === false) {
        this.ackNrs.push(this.seqNr)
        this.logger(`Packet Arrived Out of Order.  seqNr: ${this.seqNr} ackNr: ${this.ackNr}`)
        this.logger(`Sending Selective Ack`)
        await sendAckPacket(this)
      } else {
        throw new Error('Packet Read Error')
      }
    } catch {
      this.logger(`Socket Reader is unavailable.`)
      return
    }
  }

  async handleFinPacket(packet: Packet): Promise<Uint8Array | undefined> {
    this.logger(
      `expecting ${this.nextSeq}-${this.nextAck}.  got ${packet.header.seqNr}-${packet.header.ackNr}`
    )
    this.logger(`Connection State: GotFin`)
    this.state = ConnectionState.GotFin
    try {
      this.readerContent = await this.reader!.run()
    } catch {
      this.logger('Problem with Reader.run()')
    }
    this.logger(`Packet payloads compiled`)
    await sendAckPacket(this)
    return this.readerContent
  }

  async startDataTransfer(): Promise<void> {
    this.logger(`Beginning transfer of ${this.content.length} bytes...`)
    this.logger(this.content)
    await this.write()
    return
  }

  updateRTT(packetRTT: number) {
    // Updates Round Trip Time (Time between sending DATA packet and receiving ACK packet)
    this.rtt_var += Math.abs(this.rtt - packetRTT - this.rtt_var) / 4
    this.rtt += (packetRTT - this.rtt) / 8
  }

  async write(): Promise<void> {
    await this.writer!.start()
    this.logger('All data packets sent')
    return
  }

  compare(): boolean {
    const sent = JSON.stringify(this.dataNrs)
    const received = JSON.stringify(this.ackNrs)
    const equal = sent === received
    return equal
  }
}
