import { BitArray, BitVectorType } from '@chainsafe/ssz'

import { bitmap } from '../../../index.js'
import { PacketManager } from '../Packets/PacketManager.js'
import { ConnectionState, PacketType } from '../index.js'

import type { ENR } from '@chainsafe/enr'
import type { Debugger } from 'debug'
import type { NetworkId } from '../../../index.js'
import type {
  ICreatePacketOpts,
  Packet,
  PortalNetworkUTP,
  UtpSocketOptions,
  UtpSocketType,
} from '../index.js'

export abstract class UtpSocket {
  utp: PortalNetworkUTP
  networkId: NetworkId
  type: UtpSocketType
  content: Uint8Array
  remoteAddress: ENR
  protected seqNr: number
  ackNr: number
  finNr: number | undefined
  sndConnectionId: number
  rcvConnectionId: number
  state: ConnectionState | null
  readerContent: Uint8Array | undefined
  ackNrs: (number | undefined)[]
  received: number[]
  expected: number[]
  logger: Debugger
  packetManager: PacketManager
  constructor(options: UtpSocketOptions) {
    this.utp = options.utp
    this.networkId = options.networkId
    this.content = options.content ?? Uint8Array.from([])
    this.remoteAddress = options.enr
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
  }

  updateDelay(timestamp: number, timeReceived: number) {
    this.packetManager.congestionControl.updateDelay(timestamp, timeReceived)
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

  setState(state: ConnectionState) {
    this.state = state
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
    await this.utp.send(this.remoteAddress, msg, this.networkId)
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
    this.state = ConnectionState.SynSent
    await this.sendPacket<PacketType.ST_SYN>(p)
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

  abstract handleSynPacket(seqNr?: number): Promise<void>

  async handleFinAck(): Promise<boolean> {
    this.logger(`FIN packet ACKed. Closing Socket.`)
    this.state = ConnectionState.Closed
    this._clearTimeout()
    return true
  }

  abstract handleStatePacket(ackNr: number, timestamp?: number): Promise<void>

  abstract handleFinPacket(
    packet?: Packet<PacketType.ST_FIN>,
    compile?: boolean,
  ): Promise<Uint8Array | void>

  abstract close(compile?: boolean): Uint8Array | void

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
