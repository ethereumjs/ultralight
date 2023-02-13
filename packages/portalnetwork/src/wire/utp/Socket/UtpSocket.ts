import {
  Packet,
  PacketType,
  ConnectionState,
  ICreate,
  ICreatePacketOpts,
  UtpSocketOptions,
  UtpSocketType,
  ICreateData,
} from '../index.js'
import EventEmitter from 'events'
import { ProtocolId, bitmap } from '../../../index.js'
import { Debugger } from 'debug'
import ContentWriter from './ContentWriter.js'
import ContentReader from './ContentReader.js'
import { PacketManager } from '../Packets/PacketManager.js'
import { BitArray, BitVectorType } from '@chainsafe/ssz'

export class UtpSocket extends EventEmitter {
  type: UtpSocketType
  content: Uint8Array
  remoteAddress: string
  protected seqNr: number
  ackNr: number
  finNr: number | undefined
  sndConnectionId: number
  rcvConnectionId: number
  state: ConnectionState | null
  writer: ContentWriter | undefined
  reader: ContentReader | undefined
  readerContent: Uint8Array | undefined
  ackNrs: (number | undefined)[]
  received: number[]
  expected: number[]
  logger: Debugger
  packetManager: PacketManager
  throttle: () => void
  updateDelay: (timestamp: number, timeReceived: number) => void
  updateRTT: (packetRTT: number) => void
  updateWindow: () => void
  constructor(options: UtpSocketOptions) {
    super()
    this.content = options.content ?? Uint8Array.from([])
    this.remoteAddress = options.remoteAddress
    this.rcvConnectionId = options.rcvId
    this.sndConnectionId = options.sndId
    this.seqNr = options.seqNr
    this.ackNr = options.ackNr
    this.finNr = undefined
    this.state = null
    this.readerContent = new Uint8Array()
    this.type = options.type
    this.ackNrs = []
    this.received = []
    this.expected = []
    this.logger = options.logger
      .extend(`${this.type}Socket`)
      .extend(this.rcvConnectionId.toString())
    this.packetManager = new PacketManager(options.rcvId, options.sndId, this.logger)
    this.throttle = () => this.packetManager.congestionControl.throttle()
    this.updateDelay = (timestamp: number, timeReceived: number) =>
      this.packetManager.congestionControl.updateDelay(timestamp, timeReceived)
    this.updateRTT = (packetRtt: number) =>
      this.packetManager.congestionControl.updateRTT(packetRtt)
    this.updateWindow = () => this.packetManager.updateWindow()
    this.packetManager.congestionControl.on('write', async () => {
      await this.writer?.write()
    })
  }

  setAckNr(ackNr: number) {
    this.ackNr = ackNr
  }

  setSeqNr(seqNr: number) {
    this.seqNr = seqNr
  }

  getSeqNr() {
    return this.seqNr
  }

  setWriter() {
    this.writer = new ContentWriter(this.content, this.seqNr + 1, this.logger)
    this.writer.on('send', async (packetType: PacketType, bytes?: Uint8Array) => {
      if (packetType === PacketType.ST_DATA && bytes) {
        await this.sendDataPacket(bytes)
        this.writer?.emit('sent')
      } else {
        await this.sendFinPacket()
        this.writer?.emit('sent')
      }
    })
    this.writer.start()
  }

  setReader(startingSeqNr: number) {
    this.reader = new ContentReader(startingSeqNr)
  }

  _clearTimeout() {
    clearTimeout(this.packetManager.congestionControl.timeoutCounter)
  }

  async sendPacket<T extends PacketType>(packet: Packet<T>, type: PacketType): Promise<Buffer> {
    // console.log('packet', packet)
    const msg = packet.encode()
    const messageData: Record<PacketType, string> = {
      0: `seqNr: ${packet.header.seqNr}`,
      1: `seqNr: ${packet.header.seqNr}`,
      2: `ackNr: ${packet.header.ackNr}`,
      3: ``,
      4: `rcvId: ${this.rcvConnectionId}`,
    }
    this.logger(`${PacketType[packet.header.pType]}   sent - ${messageData[type]}`)
    this.emit('send', this.remoteAddress, msg, ProtocolId.HistoryNetwork, true)
    return msg
  }

  createPacket<T extends PacketType>(
    opts: ICreatePacketOpts<T> = {} as ICreatePacketOpts<T>
  ): Packet<T> {
    opts.pType === PacketType.ST_DATA && this.seqNr++
    const extension = 'bitmask' in opts ? 1 : 0
    const params: ICreate<T> = {
      ...opts,
      seqNr: this.seqNr,
      ackNr: this.ackNr,
      extension,
    }
    return this.packetManager.createPacket<T>(params)
  }

  async sendSynPacket(): Promise<void> {
    const p = this.createPacket<PacketType.ST_SYN>({ pType: PacketType.ST_SYN })
    await this.sendPacket<PacketType.ST_SYN>(p, PacketType.ST_SYN)
    this.state = ConnectionState.SynSent
  }
  async sendAckPacket(bitmask?: Uint8Array): Promise<void> {
    const packet = bitmask
      ? this.createPacket<PacketType.ST_STATE>({ pType: PacketType.ST_STATE, bitmask })
      : this.createPacket<PacketType.ST_STATE>({ pType: PacketType.ST_STATE })
    await this.sendPacket<PacketType.ST_STATE>(packet, PacketType.ST_STATE)
  }
  async sendSynAckPacket(): Promise<void> {
    this.state = ConnectionState.SynRecv
    await this.sendAckPacket()
  }
  async sendResetPacket() {
    this.state = ConnectionState.Reset
    const packet = this.createPacket<PacketType.ST_RESET>({ pType: PacketType.ST_RESET })
    await this.sendPacket<PacketType.ST_RESET>(packet, PacketType.ST_RESET)
  }

  async sendFinPacket(): Promise<void> {
    const packet = this.createPacket<PacketType.ST_FIN>({ pType: PacketType.ST_FIN })
    this.finNr = packet.header.seqNr
    await this.sendPacket<PacketType.ST_FIN>(packet, PacketType.ST_FIN)
  }

  async sendDataPacket(bytes: Uint8Array): Promise<Packet<PacketType.ST_DATA>> {
    await this.packetManager.congestionControl.canSend()
    const packet = this.createPacket<PacketType.ST_DATA>({
      pType: PacketType.ST_DATA,
      payload: bytes,
    } as ICreateData)
    await this.sendPacket<PacketType.ST_DATA>(packet, PacketType.ST_DATA)
    this.packetManager.congestionControl.outBuffer.set(
      packet.header.seqNr,
      packet.header.timestampMicroseconds
    )
    this.updateWindow()
    return packet
  }

  async handleSynPacket(): Promise<void> {
    this.logger(`Connection State: SynRecv`)
    this.state = ConnectionState.SynRecv
    return this.sendSynAckPacket()
  }

  handleFinAck(): boolean {
    this.logger(`FIN packet ACKed. Closing Socket.`)
    this.state = ConnectionState.Closed
    this._clearTimeout()
    return true
  }

  async handleStatePacket(
    packet: Packet<PacketType.ST_STATE>
  ): Promise<void | boolean | Packet<PacketType.ST_STATE>> {
    if (packet.header.ackNr === this.finNr) {
      return this.handleFinAck()
    }
    if (this.type === 'read') {
      this.state = ConnectionState.Connected
      return await this.sendAckPacket()
    } else {
      this.state = ConnectionState.Connected
      this.packetManager.updateWindow()
      this.logProgress()
      if (this.compare()) {
        this.logger(`all data packets acked`)
        this.sendFinPacket()
        return true
      } else {
        this.writer?.writing && this.writer.write()
      }
    }
  }

  async handleDataPacket(packet: Packet<PacketType.ST_DATA>): Promise<void> {
    this._clearTimeout()
    this.state = ConnectionState.Connected
    let expected = true
    if (this.ackNrs.length > 1) {
      expected = this.ackNr + 1 === packet.header.seqNr
    }
    this.setSeqNr(this.getSeqNr() + 1)
    if (!this.reader) {
      this.reader = new ContentReader(packet.header.seqNr)
    }
    // Add the packet.seqNr to this.ackNrs at the relative index, regardless of order received.
    if (this.ackNrs[0] === undefined) {
      this.logger(`Setting AckNr[0] to ${packet.header.seqNr}]`)
      this.ackNrs[0] = packet.header.seqNr
    } else {
      this.logger(
        `Setting AckNr[${packet.header.seqNr - this.ackNrs[0]}] to ${packet.header.seqNr}]`
      )
      this.ackNrs[packet.header.seqNr - this.ackNrs[0]] = packet.header.seqNr
    }
    const add = await this.reader.addPacket(packet)
    if (expected) {
      // Update this.ackNr to last in-order seqNr received.
      const future = this.ackNrs.slice(packet.header.seqNr - this.ackNrs[0]!)
      this.ackNr = future.slice(future.findIndex((n, i, ackNrs) => ackNrs[i + 1] === undefined))[0]!
      // Send "Regular" ACK with the new this.ackNr
      return await this.sendAckPacket()
    } else {
      // Do not increment this.ackNr
      // Send SELECTIVE_ACK with bitmask of received seqNrs > this.ackNr
      this.logger(`Packet has arrived out of order.  Replying with SELECTIVE ACK.`)
      const bitmask = this.generateSelectiveAckBitMask()
      return await this.sendAckPacket(bitmask)
    }
  }

  async handleFinPacket(packet: Packet<PacketType.ST_FIN>): Promise<Uint8Array | undefined> {
    this.logger(`Connection State: GotFin`)
    this.state = ConnectionState.GotFin
    const _content = await this.reader!.run()
    this.logger(`Packet payloads compiled into ${_content.length} bytes.  Sending FIN-ACK`)
    this.seqNr = this.seqNr + 1
    this.ackNr = packet.header.seqNr
    this.sendAckPacket()
    this._clearTimeout()
    return _content
  }

  compare(): boolean {
    if (!this.ackNrs.includes(undefined) && this.ackNrs.length === this.writer!.dataNrs.length) {
      return true
    }
    return false
  }

  close(): void {
    clearInterval(this.packetManager.congestionControl.timeoutCounter)
    this.packetManager.congestionControl.removeAllListeners()
    this.removeAllListeners()
  }
  logProgress() {
    const needed = this.writer!.dataNrs.filter((n) => !this.ackNrs.includes(n))
    this.logger(
      `AckNr's received (${this.ackNrs.length}/${
        this.writer!.sentChunks.length
      }): ${this.ackNrs[0]?.toString()}...${
        this.ackNrs.slice(1).length > 3
          ? this.ackNrs.slice(this.ackNrs.length - 3)?.toString()
          : this.ackNrs.slice(1)?.toString()
      }`
    )
    this.logger(`AckNr's needed (${needed.length}/${
      Object.keys(this.writer!.dataChunks).length
    }): ${needed.slice(0, 3)?.toString()}${
      needed.slice(3)?.length > 0 ? '...' + needed[needed.length - 1] : ''
    }
        `)
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
}
