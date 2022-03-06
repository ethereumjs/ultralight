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
    this.content = content ?? Uint8Array.from([])
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

  async updateSocketFromPacketHeader(packet: Packet) {
    this.ackNr = packet.header.seqNr
    this.updateRTT(packet.header.timestampDiff)
    this.cur_window = packet.header.wndSize
  }

  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
    this.seqNr++
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
    if (packet.header.seqNr === 1) {
      this.nextSeq == packet.header.ackNr + 1
    } else if (packet.header.ackNr === 1) {
      this.nextAck = packet.header.seqNr + 1
    }
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
    if (packet.header.seqNr === 1) {
      if (this.nextSeq === 1) {
        this.nextSeq++
      }
    } else if (packet.header.ackNr === 1) {
      if (this.nextAck === 1) {
        this.nextAck++
      }
    }
    this.logger(`Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    await sendSynAckPacket(this)
  }

  async handleStatePacket(packet: Packet): Promise<void> {
    this.updateSocketFromPacketHeader(packet)

    this.logger(
      `expecting ${this.nextSeq}-${this.nextAck}.  got ${packet.header.seqNr}-${packet.header.ackNr}`
    )
    this.nextSeq = packet.header.seqNr + 1
    this.nextAck = packet.header.ackNr + 1
    if (this.type === 'read') {
      await sendAckPacket(this)
    } else {
      this.ackNrs.push(packet.header.ackNr)
      let finished = this.dataNrs.every((val, index) => val === this.ackNrs[index])
      while (!finished) {
        finished = this.dataNrs.every((val, index) => val === this.ackNrs[index])
      }
      this.logger(`all data packets acked`)
      await sendFinPacket(this)
    }
  }

  async handleDataPacket(packet: Packet): Promise<void> {
    this.logger(
      `expecting ${this.nextSeq}-${this.nextAck}.  got ${packet.header.seqNr}-${packet.header.ackNr}`
    )
    this.nextSeq = packet.header.seqNr + 1
    this.nextAck = packet.header.ackNr + 1
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
    this.logger(
      `expecting ${this.nextSeq}-${this.nextAck}.  got ${packet.header.seqNr}-${packet.header.ackNr}`
    )
    this.nextSeq = packet.header.seqNr + 1
    this.nextAck = packet.header.ackNr + 1
    this.updateSocketFromPacketHeader(packet)
    this.logger(`Connection State: GotFin`)
    this.state = ConnectionState.GotFin
    const finNr = packet.header.seqNr
    let finished = false
    while (!finished) {
      this.logger(`Waiting for ${finNr - this.ackNrs.length} in-flight packets.`)
      finished = this.dataNrs.every((val, index) => val === this.ackNrs[index])
    }
    this.logger(`Received ${this.ackNrs.length} Packets. Expected ${finNr}`)
    this.logger(`Waiting for 0 in-flight packets.`)
    this.readerContent = this.reader!.run() ?? Uint8Array.from([])
    this.logger(`Packet payloads compiled`)
    await sendAckPacket(this)
  }

  async startDataTransfer(data: Uint8Array, writer: ContentWriter) {
    this.logger(`Beginning transfer of ${data}...to ${this.remoteAddress}`)
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
          `AckNr's expected: ${this.dataNrs.toString()} \n AckNr's received: ${this.ackNrs.toString()}`
        )
        compared = this.compare()
      }
    })
  }

  compare(): boolean {
    const sent = this.dataNrs.sort()
    const received = this.ackNrs.sort()
    return sent === received
  }
}
