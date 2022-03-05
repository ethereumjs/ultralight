import { DELAY_TARGET, Packet, PacketType, randUint16, DEFAULT_WINDOW_SIZE } from '..'
import { ConnectionState } from '.'

import EventEmitter from 'events'
import { SubNetworkIds } from '../..'
import { Debugger } from 'debug'
import ContentWriter from '../Protocol/write/ContentWriter'
import ContentReader from '../Protocol/read/ContentReader'
import { BasicUtp } from '../PortalNetworkUtp/BasicUtp'
import {
  sendAckPacket,
  sendDataPacket,
  sendFinPacket,
  sendSynAckPacket,
} from '../PortalNetworkUtp/PacketSenders'
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
  readerContent: Uint8Array
  seqNrs: number[]
  ackNrs: number[]
  received: number[]
  expected: number[]
  nextAck: number | undefined
  logger: Debugger
  constructor(
    utp: BasicUtp,
    remoteAddress: string,
    sndId: number,
    rcvId: number,
    type: 'read' | 'write',
    logger: Debugger,
    content?: Uint8Array
  ) {
    super()
    this.content = content ?? Uint8Array.from([])
    this.utp = utp
    this.remoteAddress = remoteAddress
    this.rcvConnectionId = rcvId
    this.sndConnectionId = sndId
    this.seqNr = type === 'write' ? randUint16() : 0
    this.ackNr = type === 'read' ? 0 : randUint16()
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
    this.seqNrs = []
    this.ackNrs = []
    this.received = []
    this.expected = []
    this.logger = logger.extend(this.remoteAddress.slice(0, 10))
  }

  async updateSocketFromPacketHeader(packet: Packet) {
    this.ackNr = packet.header.seqNr
    this.updateRTT(packet.header.timestampDiff)
    this.cur_window = packet.header.wndSize
  }

  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
    const msg = packet.encodePacket()
    await this.utp.send(this.remoteAddress, msg, SubNetworkIds.HistoryNetwork)
    this.logger(
      `${PacketType[type]} packet sent. seqNr: ${packet.header.seqNr}  ackNr: ${packet.header.ackNr}`
    )
    return msg
  }

  async sendSynPacket(packet: Packet): Promise<void> {
    await this.sendPacket(packet, PacketType.ST_SYN)
  }

  async sendSynAckPacket(packet: Packet): Promise<void> {
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async sendDataPacket(packet: Packet): Promise<void> {
    await sendDataPacket(this, packet.payload)
  }

  async sendStatePacket(packet: Packet): Promise<void> {
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async sendResetPacket(packet: Packet) {
    await this.sendPacket(packet, PacketType.ST_RESET)
  }

  async sendFinPacket(packet: Packet) {
    await this.sendPacket(packet, PacketType.ST_RESET)
  }

  async handleSynPacket(packet: Packet): Promise<void> {
    this.updateSocketFromPacketHeader(packet)
    this.nextAck = this.ackNr + 1
    this.logger(`Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    await sendSynAckPacket(this)
  }

  async handleStatePacket(packet: Packet): Promise<void> {
    this.updateSocketFromPacketHeader(packet)
    this.ackNrs.push(packet.header.ackNr)
    this.logger(`expecting ${this.nextAck}.  got ${packet.header.ackNr}`)
    let finished = this.seqNrs.every((val, index) => val === this.ackNrs[index])
    while (!finished) {
      finished = this.seqNrs.every((val, index) => val === this.ackNrs[index])
    }
    this.logger(`all data packets acked`)
    await sendFinPacket(this)
  }

  async handleDataPacket(packet: Packet): Promise<void> {
    this.updateSocketFromPacketHeader(packet)
    const expected = await this.reader!.addPacket(packet)
    if (expected) {
      this.ackNrs.push(this.seqNr)
      await sendAckPacket(this)
    } else {
      this.ackNrs.push(this.seqNr)
      await sendAckPacket(this)
      this.logger(`Packet Arrived Out of Order.  seqNr: ${this.seqNr} ackNr: ${this.ackNr}`)
      this.logger(`Sending Selective Ack`)
    }
  }

  async handleFinPacket(packet: Packet): Promise<void> {
    this.updateSocketFromPacketHeader(packet)
    this.logger(`Connection State: GotFin`)
    this.state = ConnectionState.GotFin
    const finNr = packet.header.seqNr
    let finished = false
    while (!finished) {
      this.logger(`Waiting for ${finNr - this.ackNrs.length} in-flight packets.`)
      finished = this.seqNrs.every((val, index) => val === this.ackNrs[index])
    }
    this.logger(`Received ${this.ackNrs.length} Packets. Expected ${finNr}`)
    this.logger(`Waiting for 0 in-flight packets.`)
    this.readerContent = this.reader!.run() ?? Uint8Array.from([])
    this.logger(`Packet payloads compiled`)
    await sendAckPacket(this)
  }

  async startDataTransfer(data: Uint8Array, writer: ContentWriter) {
    this.logger(`Beginning transfer of ${data.slice(0, 20)}...to ${this.remoteAddress}`)
    await this.write(writer)
  }

  updateRTT(packetRTT: number) {
    // Updates Round Trip Time (Time between sending DATA packet and receiving ACK packet)
    this.rtt_var += Math.abs(this.rtt - packetRTT - this.rtt_var) / 4
    this.rtt += (packetRTT - this.rtt) / 8
  }

  async write(writer: ContentWriter): Promise<void> {
    writer.start().then(() => {
      let compared = this.compare()
      if (!compared) {
        this.logger(
          `AckNr's expected: ${this.seqNrs.toString()} \n AckNr's received: ${this.ackNrs.toString()}`
        )
        compared = this.compare()
      }
    })
  }

  compare(): boolean {
    const sent = this.seqNrs.sort()
    const received = this.ackNrs.sort()
    return sent === received
  }
}
