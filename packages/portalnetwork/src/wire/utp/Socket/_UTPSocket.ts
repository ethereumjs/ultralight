import {
  createAckPacket,
  createDataPacket,
  createFinPacket,
  createResetPacket,
  createSynPacket,
  DELAY_TARGET,
  Packet,
  PacketType,
  randUint16,
  UINT16MAX,
  UtpProtocol,
  Bytes32TimeStamp,
  DEFAULT_WINDOW_SIZE,
} from '..'
import { ConnectionState } from '.'

import EventEmitter from 'events'
import { Discv5 } from '@chainsafe/discv5'
import { SubNetworkIds } from '../..'
import { Debugger } from 'debug'
import Writer from '../Protocol/write/Writer'
import Reader from '../Protocol/read/Reader'

export class _UTPSocket extends EventEmitter {
  utp: UtpProtocol
  content: Uint8Array
  remoteAddress: string
  seqNr: number
  client: Discv5
  ackNr: number
  sndConnectionId: number
  rcvConnectionId: number
  max_window: number
  cur_window: number
  reply_micro: number
  state: ConnectionState | null
  rtt: number
  rtt_var: number
  baseDelay: number
  ourDelay: number
  sendRate: number
  CCONTROL_TARGET: number
  writer: Writer | undefined
  reader: Reader
  readerContent: Uint8Array
  reading: boolean
  writing: boolean
  seqNrs: number[]
  ackNrs: number[]
  logger: Debugger
  subnetwork: SubNetworkIds
  constructor(utp: UtpProtocol, remoteAddress: string, type: string, networkId: SubNetworkIds) {
    super()
    this.utp = utp
    this.client = utp.client
    this.remoteAddress = remoteAddress
    this.rcvConnectionId = randUint16() & (UINT16MAX - 1)
    this.sndConnectionId = this.rcvConnectionId + 1
    this.seqNr = type === 'writing' ? randUint16() : 1
    this.ackNr = 0
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
    this.content = Uint8Array.from([])
    this.readerContent = new Uint8Array()
    this.reading = type === 'reading'
    this.writing = type === 'writing'
    this.seqNrs = []
    this.ackNrs = []
    this.logger = this.utp.log.extend(this.remoteAddress.slice(0, 10))
    this.reader = new Reader(this)
    this.subnetwork = networkId
  }

  async updateSocketFromPacketHeader(packet: Packet) {
    this.ackNr = packet.header.seqNr
    this.updateRTT(packet.header.timestampDiff)
    this.cur_window = packet.header.wndSize
  }

  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
    this.content
    const msg = packet.encodePacket()
    await this.utp.portal.sendPortalNetworkMessage(
      this.remoteAddress,
      msg,
      SubNetworkIds.HistoryNetwork,
      true
    )
    this.logger(
      `${PacketType[type]} packet sent. seqNr: ${packet.header.seqNr}  ackNr: ${packet.header.ackNr}`
    )
    return msg
  }

  async handleIncomingConnectionRequest(packet: Packet): Promise<void> {
    this.setConnectionIdsFromPacket(packet)
    this.ackNr = packet.header.seqNr
    this.logger(`Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    await this.sendSynAckPacket()
  }

  async handleSynAckPacket(packet: Packet): Promise<void> {
    this.ackNr = packet.header.seqNr - 1
    this.logger(`Connection State: Connected`)
    this.state = ConnectionState.Connected
    if (this.reading) {
      this.sendAckPacket().then(() => {
        this.logger(`Reader listening for DATA packets...`)
      })
    } else if (this.writing) {
      this.write(this.content)
    }
  }

  async handleDataPacket(packet: Packet): Promise<void> {
    this.updateSocketFromPacketHeader(packet)
    // Naive Solution -- Writes packet payload to content array (regardless of packet order)
    this.content = Uint8Array.from([...(this.content ?? []), ...packet.payload])
    this.logger(`Connection State: Connected`)
    this.state = ConnectionState.Connected
    const expected = await this.reader.addPacket(packet)
    if (expected) {
      this.ackNrs.push(this.seqNr)
      await this.sendAckPacket()
    } else {
      await this.sendSelectiveAckPacket(packet)
      this.logger(`Packet Arrived Out of Order.  seqNr: ${this.seqNr} ackNr: ${this.ackNr}`)
      this.logger(`Sending Selective Ack`)
    }
  }

  async handleStatePacket(packet: Packet): Promise<void> {
    await this.updateSocketFromPacketHeader(packet)
    if (this.state === ConnectionState.SynSent && packet.header.ackNr === 1) {
      this.state = ConnectionState.Connected
      this.handleSynAckPacket(packet)
    } else {
      if (packet.header.seqNr == 2) {
        this.content
          ? this.write(this.content).then(() => this.logger(`Finishing uTP data stream...`))
          : await this.sendFinPacket()
      } else if (packet.header.ackNr === this.seqNr) {
        this.logger(`FIN acked`)
        return
      } else {
        this.ackNrs.push(packet.header.ackNr)
        this.logger(`expecting ${this.seqNrs}.  got ${this.ackNrs}`)
        if (this.seqNrs.every((val, index) => val === this.ackNrs[index])) {
          this.logger(`all data packets acked.  Closing Stream.`)
          this.sendFinPacket()
        }
      }
    }
  }

  async handleFinPacket(packet: Packet): Promise<void> {
    this.logger(`Connection State: GotFin`)
    this.state = ConnectionState.GotFin
    this.updateSocketFromPacketHeader(packet)
    await this.sendAckPacket()
    if (this.seqNrs.every((val, index) => val === this.ackNrs[index])) {
      this.logger(`Waiting for 0 in-flight packets.`)
      this.readerContent = this.reader.run() ?? Uint8Array.from([])
      this.logger(`Packet payloads compiled`)
    }
  }

  async sendSelectiveAck(__packet: Packet) {
    const _packet = createAckPacket(
      this.seqNr++,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    )
    await this.sendPacket(_packet, PacketType.ST_STATE)
  }

  async sendSelectiveAckPacket(_packet: Packet) {}

  async sendAckPacket(): Promise<void> {
    const packet = createAckPacket(
      this.seqNr++,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    )
    await this.sendPacket(packet, PacketType.ST_STATE)
  }
  async sendSynAckPacket(): Promise<void> {
    const seq = randUint16()
    this.seqNr = seq
    const packet = createAckPacket(
      this.seqNr++,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    )
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async sendSynPacket(connectionId: number): Promise<void> {
    // Initiates a uTP connection from a ConnectionId
    this.rcvConnectionId = connectionId
    this.sndConnectionId = connectionId + 1
    this.ackNr = randUint16()
    this.seqNr = 1
    this.logger(`Initializing ackNr to random Uint16.......${this.ackNr}`)
    const packet = createSynPacket(this.rcvConnectionId, this.seqNr, this.ackNr)
    this.state = ConnectionState.SynSent
    this.seqNr++
    await this.sendPacket(packet, PacketType.ST_SYN)
  }

  async sendFinPacket(): Promise<void> {
    const packet = createFinPacket(this.sndConnectionId, this.seqNr, this.ackNr, this.cur_window)
    await this.sendPacket(packet, PacketType.ST_FIN)
  }

  async sendResetPacket() {
    const packet = createResetPacket(this.seqNr++, this.sndConnectionId, this.ackNr)
    await this.sendPacket(packet, PacketType.ST_RESET)
  }

  async sendDataPacket(payload: Uint8Array): Promise<Packet> {
    const packet = createDataPacket(
      this.seqNr,
      this.sndConnectionId,
      this.ackNr,
      this.max_window,
      payload,
      this.rtt_var
    )
    this.seqNr++
    this.seqNrs.push(packet.header.seqNr)
    await this.sendPacket(packet, PacketType.ST_DATA)
    return packet
  }

  startDataTransfer(data: Uint8Array) {
    this.logger(`Beginning transfer of ${data.slice(0, 20)}...to ${this.remoteAddress}`)
    this.write(data)
  }

  updateRTT(packetRTT: number) {
    // Updates Round Trip Time (Time between sending DATA packet and receiving ACK packet)
    this.rtt_var += Math.abs(this.rtt - packetRTT - this.rtt_var) / 4
    this.rtt += (packetRTT - this.rtt) / 8
  }

  setConnectionIdsFromPacket(p: Packet) {
    const id = p.header.connectionId
    this.sndConnectionId = id
    this.rcvConnectionId = id + 1
  }

  async write(content: Uint8Array): Promise<string> {
    const writer: Writer = new Writer(this.utp, this, content, Bytes32TimeStamp())
    this.writer = writer
    this.writer.start().then(() => {
      let compared = this.compare()
      if (!compared) {
        this.logger(
          `AckNr's expected: ${this.seqNrs.toString()} \n AckNr's received: ${this.ackNrs.toString()}`
        )
        compared = this.compare()
      }
      this.logger(`All Data sent...  Building FIN Packet...`)
    })
    return `AckNr's expected: ${this.seqNrs} \n AckNr's received: ${this.ackNrs}`
  }

  compare(): boolean {
    const sent = this.seqNrs.sort()
    const received = this.ackNrs.sort()
    return sent === received
  }
}
