import { BitArray, BitVectorType } from '@chainsafe/ssz'
import EventEmitter from 'events'

import { bitmap } from '../../../index.js'
import { PacketManager } from '../Packets/PacketManager.js'
import { ConnectionState, PacketType, UtpSocketType } from '../index.js'

import { ContentReader } from './ContentReader.js'
import { ContentWriter } from './ContentWriter.js'

import type { NetworkId } from '../../../index.js'
import type { ICreateData, ICreatePacketOpts, Packet, UtpSocketOptions } from '../index.js'
import type { Debugger } from 'debug'

export class UtpSocket extends EventEmitter {
  networkId: NetworkId
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
  updateRTT: (packetRTT: number, ackNr: number) => void
  updateWindow: () => void
  constructor(options: UtpSocketOptions) {
    super()
    this.networkId = options.networkId
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
    this.updateRTT = (packetRtt: number, ackNr: number) =>
      this.packetManager.congestionControl.updateRTT(packetRtt, ackNr)
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

  setWriter(seqNr: number) {
    this.setSeqNr(seqNr)
    this.writer = new ContentWriter(this.content, seqNr, this.logger)
    this.writer.on('send', async (packetType: PacketType, bytes?: Uint8Array) => {
      if (packetType === PacketType.ST_DATA && bytes) {
        await this.sendDataPacket(bytes)
        this.writer?.emit('sent')
      } else {
        await this.sendFinPacket()
        this.writer?.emit('sent')
      }
    })
    void this.writer.start()
  }
  setState(state: ConnectionState) {
    this.state = state
  }

  setReader(startingSeqNr: number) {
    this.reader = new ContentReader(startingSeqNr - 1)
  }

  _clearTimeout() {
    clearTimeout(this.packetManager.congestionControl.timeoutCounter)
  }

  async sendPacket<T extends PacketType>(packet: Packet<T>): Promise<Buffer> {
    const msg = packet.encode()
    this.logger.extend('SEND').extend(PacketType[packet.header.pType])(
      `|| pktId: ${packet.header.connectionId}`,
    )
    this.logger.extend('SEND').extend(PacketType[packet.header.pType])(
      `|| seqNr: ${packet.header.seqNr}`,
    )
    this.logger.extend('SEND').extend(PacketType[packet.header.pType])(
      `|| ackNr: ${packet.header.ackNr}`,
    )
    this.emit('send', this.remoteAddress, msg, this.networkId, true)
    return msg
  }

  createPacket<T extends PacketType>(
    opts: ICreatePacketOpts<T> = {} as ICreatePacketOpts<T>,
  ): Packet<T> {
    const extension = 'bitmask' in opts ? 1 : 0
    const params = {
      ...opts,
      seqNr: this.seqNr,
      ackNr: this.ackNr,
      connectionId: opts.connectionId ?? this.rcvConnectionId,
      extension,
    }
    opts.pType === PacketType.ST_DATA && this.seqNr++
    return this.packetManager.createPacket<T>(params)
  }

  async sendSynPacket(pktId?: number): Promise<void> {
    const p = this.createPacket({
      pType: PacketType.ST_SYN,
      connectionId: pktId ?? this.rcvConnectionId,
    })
    await this.sendPacket<PacketType.ST_SYN>(p)
    this.state = ConnectionState.SynSent
  }
  async sendAckPacket(bitmask?: Uint8Array): Promise<void> {
    const packet = bitmask
      ? this.createPacket({ pType: PacketType.ST_STATE, bitmask })
      : this.createPacket({ pType: PacketType.ST_STATE })
    await this.sendPacket<PacketType.ST_STATE>(packet)
  }
  async sendSynAckPacket(): Promise<void> {
    await this.sendAckPacket()
  }
  async sendResetPacket() {
    this.state = ConnectionState.Reset
    const packet = this.createPacket<PacketType.ST_RESET>({ pType: PacketType.ST_RESET })
    await this.sendPacket<PacketType.ST_RESET>(packet)
  }
  async sendFinPacket(): Promise<void> {
    const packet = this.createPacket<PacketType.ST_FIN>({ pType: PacketType.ST_FIN })
    this.finNr = packet.header.seqNr
    await this.sendPacket<PacketType.ST_FIN>(packet)
  }
  async sendDataPacket(bytes: Uint8Array): Promise<void> {
    this.state = ConnectionState.Connected
    try {
      await this.packetManager.congestionControl.canSend()
    } catch (e) {
      this.logger(`DATA packet not acked.  Closing connection to ${this.remoteAddress}`)
      await this.sendResetPacket()
      this.close()
    }
    const packet = this.createPacket<PacketType.ST_DATA>({
      pType: PacketType.ST_DATA,
      payload: bytes,
    } as ICreateData)
    await this.sendPacket<PacketType.ST_DATA>(packet)
    this.packetManager.congestionControl.outBuffer.set(
      packet.header.seqNr,
      packet.header.timestampMicroseconds,
    )
    this.updateWindow()
  }

  async handleSynPacket(seqNr: number): Promise<void> {
    this.setState(ConnectionState.SynRecv)
    this.logger(`Connection State: SynRecv`)
    this.setAckNr(seqNr)
    this.type === UtpSocketType.READ ? this.setReader(2) : this.setWriter(seqNr - 1)
    await this.sendSynAckPacket()
  }

  async handleFinAck(): Promise<boolean> {
    this.logger(`FIN packet ACKed. Closing Socket.`)
    this.state = ConnectionState.Closed
    this._clearTimeout()
    return true
  }

  async handleStatePacket(ackNr: number, timestamp: number): Promise<void> {
    this.state === ConnectionState.Connected || this.setState(ConnectionState.Connected)
    if (ackNr === this.finNr) {
      await this.handleFinAck()
      return
    }
    if (this.type === 'read') {
      this.logger(`SYN-ACK received for FINDCONTENT request  Waiting for DATA.`)
      const startingSeqNr = this.getSeqNr()
      this.setReader(startingSeqNr)
      await this.sendAckPacket()
    } else {
      this.updateAckNrs(ackNr)
      this.updateRTT(timestamp, ackNr)
      this.packetManager.updateWindow()
      this.logProgress()
      if (this.compare()) {
        await this.sendFinPacket()
        return
      }
      await this.writer!.write()
    }
  }

  async handleDataPacket(packet: Packet<PacketType.ST_DATA>): Promise<void> {
    this._clearTimeout()
    if (this.state !== ConnectionState.GotFin) {
      this.state = ConnectionState.Connected
    } else {
      this.logger(`Connection State: GotFin: ${this.finNr}`)
    }
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
      this.logger(`Setting AckNr[0] to ${packet.header.seqNr}`)
      this.ackNrs[0] = packet.header.seqNr
    } else {
      this.logger(
        `Setting AckNr[${packet.header.seqNr - this.ackNrs[0]}] to ${packet.header.seqNr}`,
      )
      this.ackNrs[packet.header.seqNr - this.ackNrs[0]] = packet.header.seqNr
    }
    await this.reader.addPacket(packet)
    if (expected) {
      // Update this.ackNr to last in-order seqNr received.
      const future = this.ackNrs.slice(packet.header.seqNr - this.ackNrs[0]!)
      this.ackNr = future.slice(future.findIndex((n, i, ackNrs) => ackNrs[i + 1] === undefined))[0]!
      if (this.state === ConnectionState.GotFin) {
        if (this.ackNr === this.finNr) {
          this.logger(`All data packets received. Running compiler.`)
          await this.sendAckPacket()
          this.emit('done')
        }
      }
      // Send "Regular" ACK with the new this.ackNr
      return this.sendAckPacket()
    } else {
      // Do not increment this.ackNr
      // Send SELECTIVE_ACK with bitmask of received seqNrs > this.ackNr
      this.logger(`Packet has arrived out of order.  Replying with SELECTIVE ACK.`)
      const bitmask = this.generateSelectiveAckBitMask()
      return this.sendAckPacket(bitmask)
    }
  }

  async handleFinPacket(packet: Packet<PacketType.ST_FIN>): Promise<Uint8Array> {
    this.state = ConnectionState.GotFin
    this._clearTimeout()
    this.finNr = packet.header.seqNr
    this.logger(`Connection State: GotFin: ${this.finNr}`)
    const expected = this.ackNr + 1 === packet.header.seqNr
    if (expected) {
      this.logger(`all data packets received.`)
      this.seqNr = this.seqNr + 1
      this.ackNr = packet.header.seqNr
      const _content = await this.reader!.run()
      this.reader = undefined
      this.logger(`Packet payloads compiled into ${_content.length} bytes.  Sending FIN-ACK`)
      this.close()
      await this.sendAckPacket()
      return _content
    } else {
      // TODO: Else wait for all data packets.
      return new Promise((res, _rej) => {
        const panic = setTimeout(() => {
          res(Uint8Array.from([]))
        }, 5000)
        this.once('done', async () => {
          this.seqNr = this.seqNr + 1
          this.ackNr = packet.header.seqNr
          await this.sendAckPacket()
          clearTimeout(panic)
          let _content = await this.reader!.run()
          this.logger(`Packet payloads compiled into ${_content.length} bytes.  Sending FIN-ACK`)
          if (_content.length === 0) {
            while (_content.length === 0) {
              _content = await this.reader!.run()
            }
          }
          this.close()
          this._clearTimeout()
          res(_content)
        })
      })
    }
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
      }`,
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
  updateAckNrs(ackNr: number) {
    this.ackNrs = Object.keys(this.writer!.dataChunks)
      .filter((n) => parseInt(n) <= ackNr)
      .map((n) => parseInt(n))
  }
}
