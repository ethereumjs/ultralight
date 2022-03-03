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
import { HistoryNetworkContentTypes } from '../../../historySubnetwork/types'

export class _UTPSocket extends EventEmitter {
  utp: UtpProtocol
  content: Uint8Array
  contentType: HistoryNetworkContentTypes
  blockHash: Uint8Array | undefined
  remoteAddress: string
  seqNr: number
  ackNr: number
  finNr: number | undefined
  client: Discv5
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
  reader: Reader | undefined
  readerContent: Uint8Array
  reading: boolean
  writing: boolean
  seqNrs: number[]
  ackNrs: number[]
  nextAck: number | undefined
  logger: Debugger
  subnetwork: SubNetworkIds
  constructor(
    utp: UtpProtocol,
    remoteAddress: string,
    type: string,
    networkId: SubNetworkIds,
    contentType: HistoryNetworkContentTypes,
    blockHash?: Uint8Array
  ) {
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
    this.contentType = contentType
    this.readerContent = new Uint8Array()
    this.reading = type === 'reading'
    this.writing = type === 'writing'
    this.seqNrs = []
    this.ackNrs = []
    this.logger = this.utp.log.extend(this.remoteAddress.slice(0, 10))
    // this.reader = new Reader(this)
    this.subnetwork = networkId
    this.blockHash = blockHash
  }

  async updateSocketFromPacketHeader(packet: Packet) {
    this.ackNr = packet.header.seqNr
    this.updateRTT(packet.header.timestampDiff)
    this.cur_window = packet.header.wndSize
  }

  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
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

  async handleSynPacket(packet: Packet): Promise<void> {
    // this.setConnectionIdsFromPacket(packet)
    if (this.reading) {
      this.reader = new Reader(this, 2, this.blockHash!)
    }
    this.ackNr = packet.header.seqNr
    this.nextAck = this.ackNr + 1
    this.logger(`Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    await this.sendSynAckPacket()
  }

  async sendSynAckPacket(): Promise<void> {
    this.seqNr = randUint16()
    const packet = createAckPacket(
      this.seqNr++,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    )
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async handleSynAckPacket(packet: Packet): Promise<void> {
    this.ackNr = packet.header.seqNr
    this.logger(`Connection State: Connected`)
    this.state = ConnectionState.Connected
    if (this.reading) {
      this.reader = new Reader(this, packet.header.seqNr, this.blockHash!)
      this.sendAckPacket().then(() => {
        this.logger(`Reader listening for DATA packets...`)
      })
    } else if (this.writing) {
      this.write(this.content)
    }
  }
  async sendAckPacket(): Promise<void> {
    const packet = createAckPacket(
      this.seqNr++,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    )
    this.logger(
      `Creating ST_STATE packet seq: ${packet.header.seqNr}, ackNr: ${packet.header.ackNr}`
    )
    await this.sendPacket(packet, PacketType.ST_STATE)
  }

  async handleStatePacket(packet: Packet): Promise<void> {
    await this.updateSocketFromPacketHeader(packet)
    if (this.state === ConnectionState.SynSent && packet.header.ackNr === 1) {
      this.logger(`Connection State: Connected`)
      this.state = ConnectionState.Connected
      this.handleSynAckPacket(packet)
    } else {
      if (packet.header.seqNr == 2) {
        this.content
          ? this.write(this.content).then(() => this.logger(`Finishing uTP data stream...`))
          : await this.sendFinPacket()
      } else if (packet.header.ackNr === this.finNr) {
        this.logger(`FIN acked`)
        return
      } else {
        this.ackNrs.push(packet.header.ackNr)
        this.logger(`expecting ${this.nextAck}.  got ${packet.header.ackNr}`)
        if (this.seqNrs.every((val, index) => val === this.ackNrs[index])) {
          this.logger(`all data packets acked.  Closing Stream.`)
          this.sendFinPacket()
        }
      }
    }
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

  async handleDataPacket(packet: Packet): Promise<void> {
    this.updateSocketFromPacketHeader(packet)
    const expected = await this.reader!.addPacket(packet)
    if (expected) {
      this.ackNrs.push(this.seqNr)
      await this.sendAckPacket()
    } else {
      this.ackNrs.push(this.seqNr)
      await this.sendSelectiveAck(packet)
      this.logger(`Packet Arrived Out of Order.  seqNr: ${this.seqNr} ackNr: ${this.ackNr}`)
      this.logger(`Sending Selective Ack`)
    }
  }

  async sendFinPacket(): Promise<void> {
    const packet = createFinPacket(this.sndConnectionId, this.seqNr, this.ackNr, this.cur_window)
    this.finNr = packet.header.seqNr
    await this.sendPacket(packet, PacketType.ST_FIN)
  }

  async handleFinPacket(packet: Packet): Promise<void> {
    this.logger(`Connection State: GotFin`)
    this.state = ConnectionState.GotFin
    this.updateSocketFromPacketHeader(packet)
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
    await this.sendAckPacket()
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

  async sendResetPacket() {
    const packet = createResetPacket(this.seqNr++, this.sndConnectionId, this.ackNr)
    await this.sendPacket(packet, PacketType.ST_RESET)
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
