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
import { fromHexString } from '@chainsafe/ssz'
import { SubNetworkIds } from '../..'
import { debug } from 'debug'
import Writer from '../Protocol/write/Writer'
import Reader from '../Protocol/read/Reader'

const log = debug('<uTP>')

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
  constructor(utp: UtpProtocol, remoteAddress: string, type: string) {
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
    this.reader = new Reader(this)
    this.readerContent = new Uint8Array()
    this.reading = type === 'reading'
    this.writing = type === 'writing'
  }

  async updateSocketFromPacketHeader(packet: Packet) {
    this.ackNr = packet.header.seqNr
    this.updateRTT(packet.header.timestampDiff)
    this.cur_window = packet.header.wndSize
  }

  async sendPacket(packet: Packet, type: PacketType): Promise<Buffer> {
    const msg = packet.encodePacket()
    await this.client.sendTalkReq(this.remoteAddress, msg, fromHexString(SubNetworkIds.UTPNetwork))
    log(`${PacketType[type]} packet sent to ${this.remoteAddress}.`)
    type === 1 && log('uTP stream closed.')
    return msg
  }

  // handles SYN packets
  async handleIncomingConnectionRequest(packet: Packet): Promise<void> {
    // sndConnectionId and rcvConnectionId calculated from packet header
    this.setConnectionIdsFromPacket(packet)
    this.ackNr = packet.header.seqNr
    // TODO: Figure out SeqNr and AckNr initializing and incrementation

    log(`Setting Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    log(`Sending SYN ACK to accept connection request...`)
    await this.sendSynAckPacket().then(() => {
      log(`Incrementing seqNr from ${this.seqNr - 1} to ${this.seqNr}`)
      // Increments seqNr (***????????*****)
      // this.incrementSequenceNumber();
    })
  }
  // handles SYN packets
  async handleIncomingStreamRequest(packet: Packet): Promise<void> {
    // sndConnectionId and rcvConnectionId calculated from packet header
    this.setConnectionIdsFromPacket(packet)
    this.ackNr = packet.header.seqNr
    // TODO: Figure out SeqNr and AckNr initializing and incrementation

    log(`Setting Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    log(`Sending SYN ACK to accept connection request...`)
    await this.sendSynAckPacket().then(() => {
      log(`Incrementing seqNr from ${this.seqNr - 1} to ${this.seqNr}`)
      // Increments seqNr (***????????*****)
      // this.incrementSequenceNumber();
    })
  }

  async handleSynAckPacket(packet: Packet): Promise<void> {
    this.ackNr = packet.header.seqNr - 1
    log(`SYN packet accepted.  SYN ACK Received.  Connection State: Connected`)
    this.state = ConnectionState.Connected
    if (this.reading) {
      log(`Sending SYN ACK ACK`)
      await this.sendAckPacket().then(() => {
        log(`SYN ACK ACK sent...Reader listening for DATA stream...`)
      })
    } else if (this.writing) {
      this.write(this.content, packet)
    }
  }

  async handleDataPacket(packet: Packet): Promise<void> {
    // Update socket from Packet Header
    this.updateSocketFromPacketHeader(packet)
    // Naive Solution -- Writes packet payload to content array (regardless of packet order)
    this.content = Uint8Array.from([...(this.content ?? []), ...packet.payload])
    log(`Connection State: Connected`)
    this.state = ConnectionState.Connected
    log(`Sending packet payload to Reader`)
    const expected = await this.reader.addPacket(packet)
    if (expected) {
      await this.sendAckPacket().then(() => {
        log(`ACK sent.  seqNr: ${this.seqNr} ackNr: ${this.ackNr}`)
        log(`Incrementing seqNr from ${this.seqNr} to ${this.seqNr + 1}`)
      })
    } else {
      await this.sendSelectiveAckPacket(packet).then(() => {
        log(`Packet Arrived Out of Order.  seqNr: ${this.seqNr} ackNr: ${this.ackNr}`)
        log(`Sending Selective Ack`)
      })
    }
    // Send ACK if packet arrived in expected order.
    // TODO: Send SELECTIVE ACK if packet arrived out of order.
    // Call TIMEOUT if packet appears lost
  }

  async handleStatePacket(packet: Packet): Promise<void> {
    // STATE packet is ACK for a specific DATA packet.
    // TODO: handle SELECTIVE ACK packet
    this.updateSocketFromPacketHeader(packet)
    // The first STATE packet will be the SYN ACK (ackNr: 1) or the SYN ACK ACK (ackNr: Random + 1???)
    if (this.state === ConnectionState.SynSent && packet.header.ackNr === 1) {
      this.state = ConnectionState.Connected
      this.handleSynAckPacket(packet)
    } else {
      if (packet.header.seqNr == 2) {
        log(`SYN ACK ACK Received, seqNr: ${packet.header.seqNr}, ackNr: ${packet.header.ackNr}`)
        log(`Starting uTP data stream...`)
        this.content &&
          (await this.write(this.content, packet).then(() => {
            log(`Finishing uTP data stream...`)
          }))
        // a STATE packet will ACK the FIN packet to close connection.
      } else if (packet.header.ackNr === this.seqNr) {
        log(`FIN acked`)
        return
      } else {
        log(`DATA ACK Received, seqNr: ${packet.header.seqNr}, ackNr: ${packet.header.ackNr}`)
      }
    }
  }

  async handleFinPacket(packet: Packet): Promise<void> {
    log(`Setting Connection State: GotFin`)
    this.state = ConnectionState.GotFin
    this.updateSocketFromPacketHeader(packet)
    log(`Sending FIN ACK packet.`)
    await this.sendAckPacket().then(() => {
      log(`Waiting for 0 in-flight packets.`)
      this.readerContent = this.reader.run()
      log(`Packet payloads compiled`)
    })
  }

  // TODO
  // Handle SELECTIVE ACK
  // Send SELECTIVE ACK
  // Already ACKED packets

  async sendSelectiveAck(__packet: Packet) {
    const _packet = createAckPacket(
      this.seqNr++,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    )
    log(
      `Sending ST_STATE packet ackNr: ${this.ackNr} seqNr: ${this.seqNr} to ${this.remoteAddress}`
    )
    await this.sendPacket(_packet, PacketType.ST_STATE)
    log(`Incrementing SeqNre from ${this.seqNr - 1} to ${this.seqNr}`)
  }

  async sendSelectiveAckPacket(_packet: Packet) {}

  //ackAlreadyAcked(headerExtension: unknown, timestampDiff: number, spaceLeftInBuffer: number) {}

  async sendAckPacket(): Promise<void> {
    const packet = createAckPacket(
      this.seqNr++,
      this.sndConnectionId,
      this.ackNr,
      this.rtt_var,
      this.cur_window
    )
    log(
      `Sending ST_STATE packet ackNr: ${this.ackNr} seqNr: ${this.seqNr} to ${this.remoteAddress}`
    )
    await this.sendPacket(packet, PacketType.ST_STATE)
    log(`Incrementing SeqNr from ${this.seqNr - 1} to ${this.seqNr}`)
    // *******************??????????????????????**********************
    // this.incrementSequenceNumber();
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
    log(`Sending SYN ACK -  seqNr: ${this.seqNr} ackNr: ${this.ackNr}  to ${this.remoteAddress}`)
    await this.sendPacket(packet, PacketType.ST_STATE)
    log(`Incrementing SeqNr from ${this.seqNr - 1} to ${this.seqNr}`)
    // *******************??????????????????????**********************
    // this.incrementSequenceNumber();
  }

  async sendSynPacket(connectionId: number): Promise<void> {
    // Initiates a uTP connection from a ConnectionId
    this.rcvConnectionId = connectionId
    this.sndConnectionId = connectionId + 1
    this.ackNr = randUint16()
    this.seqNr = 1
    log(`Initializing ackNr to random Uint16.......${this.ackNr}`)
    const packet = createSynPacket(this.rcvConnectionId, this.seqNr, this.ackNr)
    this.state = ConnectionState.SynSent
    log(`Sending SYN packet seqNr: ${this.seqNr} ackNr: ${this.ackNr} to ${this.remoteAddress}...`)
    this.seqNr++
    await this.sendPacket(packet, PacketType.ST_SYN)
    log(`SYN packet sent with seqNr: ${this.seqNr} ackNr: ${this.ackNr}`)
    log(`Incrementing SeqNr from ${this.seqNr - 1} to ${this.seqNr}`)
  }

  async sendFinPacket(): Promise<void> {
    const packet = createFinPacket(this.sndConnectionId, this.seqNr, this.ackNr, this.cur_window)
    log(`Sending FIN packet to ${this.remoteAddress}`)
    log(`seqNr ${this.seqNr}`)
    await this.sendPacket(packet, PacketType.ST_FIN)
    log(`FIN packet ${packet} sent to ${this.remoteAddress}`)
  }

  async sendResetPacket() {
    const packet = createResetPacket(this.seqNr++, this.sndConnectionId, this.ackNr)
    log(`Sending RESET packet seqNr: ${this.seqNr} ackNr: ${this.ackNr} to ${this.remoteAddress}`)
    log(`Incrementing SeqNr from ${this.seqNr - 1} to ${this.seqNr}`)
    await this.sendPacket(packet, PacketType.ST_RESET)
    log(`RESET packet ${packet} sent to ${this.remoteAddress}`)
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
    log(
      `Sending DATA packet seqNr: ${this.seqNr} ackNr: ${this.ackNr} to ${this.remoteAddress}`,
      packet.payload
    )
    this.seqNr++
    await this.sendPacket(packet, PacketType.ST_DATA)
    log(`Incrementing SeqNr from ${this.seqNr - 1} to ${this.seqNr}`)
    return packet
  }

  startDataTransfer(data: Uint8Array, synAck: Packet) {
    log(`Beginning transfer of ${data.slice(0, 20)}...to ${this.remoteAddress}`)
    // TODO: Why am I sending ack packet to writer?
    this.write(data, synAck)
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

  async write(content: Uint8Array, synAck: Packet): Promise<void> {
    const writer: Writer = new Writer(this.utp, this, synAck, content, Bytes32TimeStamp())
    this.writer = writer
    this.writer.start().then(() => {
      log(`All Data sent...  Building FIN Packet...`)
      this.sendFinPacket()
    })
  }
}
