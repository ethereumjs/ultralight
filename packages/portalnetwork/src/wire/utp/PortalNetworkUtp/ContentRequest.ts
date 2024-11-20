import { BitVectorType } from '@chainsafe/ssz'
import { bytesToHex } from '@ethereumjs/util'
import debug from 'debug'

import {
  Bytes32TimeStamp,
  ConnectionState,
  Packet,
  PacketType,
  StateNetwork,
  bitmap,
} from '../../../index.js'

import { RequestCode } from './types.js'

import type { Debugger } from 'debug'
import type {
  BaseNetwork,
  DataPacket,
  SelectiveAckHeader,
  SocketType,
  StatePacket,
  SynPacket,
} from '../../../index.js'
import type { ReadSocket } from '../Socket/ReadSocket.js'
import type { WriteSocket } from '../Socket/WriteSocket.js'

export function bitmaskToAckNrs(bitmask: Uint8Array, ackNr: number): number[] {
  const bitArray = new BitVectorType(32).deserialize(bitmask)
  const ackNrs = bitArray.getTrueBitIndexes().map((index) => {
    return bitmap[index] + ackNr
  })
  return ackNrs
}

export interface ContentRequestOptions {
  network: BaseNetwork
  requestCode: RequestCode
  socket: SocketType
  socketKey: string
  contentKeys: Uint8Array[]
  content: Uint8Array
  logger?: Debugger
}

export abstract class ContentRequest {
  network: BaseNetwork
  requestCode: RequestCode
  socket: SocketType
  socketKey: string
  logger: Debugger
  constructor(options: ContentRequestOptions) {
    this.network = options.network
    this.requestCode = options.requestCode
    this.socketKey = options.socketKey
    this.socket = options.socket
    this.logger = options.logger ? options.logger.extend('ContentRequest') : debug('ContentRequest')
  }

  abstract init(): Promise<void>

  close(): void {
    this.socket.close()
  }

  abstract _handleSynPacket(packet?: SynPacket): Promise<void>

  abstract _handleDataPacket?(packet: Packet<PacketType.ST_DATA>): Promise<void>

  abstract _handleStatePacket(packet: Packet<PacketType.ST_STATE>): Promise<void>

  abstract _handleSelectiveAckPacket?(packet: Packet<PacketType.ST_STATE>): Promise<void>

  async _handleFinPacket(packet: Packet<PacketType.ST_FIN>): Promise<void> {
    await this.socket.handleFinPacket(packet)
  }

  async _handleResetPacket() {
    this.socket.close()
  }

  async handleUtpPacket(packetBuffer: Buffer): Promise<void> {
    const timeReceived = Bytes32TimeStamp()
    this.socket._clearTimeout()
    const packet = Packet.fromBuffer(packetBuffer)
    this.socket.updateDelay(timeReceived, packet.header.timestampMicroseconds)
    this.logger.extend('RECEIVED').extend(PacketType[packet.header.pType])(
      `|| pktId: ${packet.header.connectionId}     ||`,
    )
    this.logger.extend('RECEIVED').extend(PacketType[packet.header.pType])(
      `|| seqNr: ${packet.header.seqNr}     ||`,
    )
    this.logger.extend('RECEIVED').extend(PacketType[packet.header.pType])(
      `|| ackNr: ${packet.header.ackNr}     ||`,
    )
    switch (packet.header.pType) {
      case PacketType.ST_SYN:
        await this._handleSynPacket(packet)
        break
      case PacketType.ST_DATA:
        await this._handleDataPacket!(packet)
        break
      case PacketType.ST_STATE:
        if (packet.header.extension === 1) {
          await this._handleSelectiveAckPacket!(packet)
        } else {
          await this._handleStatePacket(packet)
        }
        break
      case PacketType.ST_RESET:
        break
      case PacketType.ST_FIN:
        await this._handleFinPacket(packet)
        break
      default:
        throw new Error(`Unknown Packet Type ${packet.header.pType}`)
    }
  }
  async returnContent(contents: Uint8Array[], keys: Uint8Array[]) {
    this.logger(`Decompressing stream into ${keys.length} pieces of content`)
    for (const [idx, k] of keys.entries()) {
      const _content = contents[idx]
      this.logger.extend(`FINISHED`)(
        `${idx + 1}/${keys.length} -- (${_content.length} bytes) sending content type: ${bytesToHex(k.slice(0, 1))} to database`,
      )
      if (this.network instanceof StateNetwork) {
        await this.network.store(k, _content, this.requestCode === RequestCode.ACCEPT_READ)
      } else {
        await this.network.store(k, _content)
      }
    }
    this.close()
  }
}

export abstract class ContentReadRequest extends ContentRequest {
  _handleSelectiveAckPacket: undefined
  socket: ReadSocket
  constructor(options: ContentRequestOptions) {
    super(options)
    this.socket = options.socket as ReadSocket
  }
}

export abstract class ContentWriteRequest extends ContentRequest {
  _handleDataPacket: undefined
  socket: WriteSocket
  constructor(options: ContentRequestOptions) {
    super(options)
    this.socket = options.socket as WriteSocket
  }
  async _handleSelectiveAckPacket(packet: StatePacket): Promise<void> {
    const ackNrs = bitmaskToAckNrs(
      (packet.header as SelectiveAckHeader).selectiveAckExtension.bitmask,
      this.socket.ackNr,
    )
    const acked = ackNrs.find((a) => !this.socket.ackNrs.includes(a))
    this.socket.logger(
      `ST_STATE (SELECTIVE_ACK) received with ackNr: ${
        packet.header.ackNr
      }, and a bitmask referencing ackNrs: ${ackNrs}.  Packet acks DATA packet seqNr: ${acked}.  Receive socket still waits for seqNr: ${
        packet.header.ackNr + 1
      }`,
    )
    if (acked !== undefined) {
      this.socket.updateRTT(packet.header.timestampMicroseconds, acked)
      this.socket.ackNrs.push(acked)
    }
    if (ackNrs.length >= 3) {
      // If packet is more than 3 behind, assume it to be lost and resend.
      this.socket.writer!.seqNr = packet.header.ackNr + 1
    }
    await this.socket.handleStatePacket(packet.header.ackNr, packet.header.timestampMicroseconds)
  }
}

export class FindContentReadRequest extends ContentReadRequest {
  requestCode: RequestCode.FINDCONTENT_READ
  contentKey: Uint8Array
  constructor(options: ContentRequestOptions) {
    super(options)
    this.requestCode = RequestCode.FINDCONTENT_READ
    this.contentKey = options.contentKeys[0]
  }
  async init(): Promise<void> {
    this.socket.logger.extend('ContentRequest')('init() - Sending a SYN')
    await this.socket.sendSynPacket(this.socket.sndConnectionId)
  }
  async _handleSynPacket(): Promise<void> {
    throw new Error(`Should not receive SYN packets during FINDCONTENT_READ`)
  }
  async _handleStatePacket(packet: StatePacket): Promise<void> {
    if (this.socket.state === ConnectionState.SynSent) {
      this.socket.setAckNr(packet.header.seqNr)
      this.socket.setReader(packet.header.seqNr)
      this.socket.reader!.bytesExpected = Infinity
      return
    } else {
      throw new Error('READ socket should not get ACKs after SYN-ACK')
    }
  }
  async _handleDataPacket(packet: DataPacket) {
    await this.socket.handleDataPacket(packet)
    if (this.socket.state === ConnectionState.GotFin) {
      // FIN packet number marks the end of data stream
      if (this.socket.finNr === undefined) {
        throw new Error('Failed to record FIN packet number')
      }
      // Check if all packets have been received from startingDataNr to finNr
      for (let i = this.socket.finNr - 1; i >= this.socket.reader!.startingDataNr; i--) {
        if (this.socket.reader!.packets[i] === undefined) {
          // If any packet is missing, return and wait for out of order packet
          return
        }
      }
      // If all packets have been received, return content
      await this.returnContent([Uint8Array.from(this.socket.reader!.bytes)], [this.contentKey])
    }
    return
  }
  async _handleFinPacket(packet: Packet<PacketType.ST_FIN>): Promise<void> {
    const content = await this.socket.handleFinPacket(packet, true)
    if (!content) return
    await this.returnContent([content], [this.contentKey])
  }
}

export class FoundContentWriteRequest extends ContentWriteRequest {
  requestCode: RequestCode.FOUNDCONTENT_WRITE
  content: Uint8Array
  contentKey: Uint8Array
  constructor(options: ContentRequestOptions) {
    super(options)
    this.requestCode = RequestCode.FOUNDCONTENT_WRITE
    this.content = options.content
    this.contentKey = options.contentKeys[0]
  }
  async init(): Promise<void> {
    this.socket.logger.extend('ContentRequest')('init() - awaiting a SYN')
  }
  async _handleSynPacket(packet: SynPacket): Promise<void> {
    await this.socket.handleSynPacket(packet.header.seqNr)
  }
  async _handleStatePacket(packet: StatePacket): Promise<void> {
    await this.socket.handleStatePacket(packet.header.ackNr, packet.header.timestampMicroseconds)
  }
}

export class AcceptReadRequest extends ContentReadRequest {
  requestCode: RequestCode.ACCEPT_READ
  contentKeys: Uint8Array[]
  constructor(options: ContentRequestOptions) {
    super(options)
    this.requestCode = RequestCode.ACCEPT_READ
    this.contentKeys = options.contentKeys
  }
  async init(): Promise<void> {
    this.socket.logger.extend('ContentRequest')('init() - awaiting a SYN')
  }
  async _handleSynPacket(packet: SynPacket): Promise<void> {
    await this.socket.handleSynPacket(packet.header.seqNr)
  }
  async _handleStatePacket(): Promise<void> {
    throw new Error(`Should not receive STATE packet during ACCEPT_READ`)
  }
  async _handleDataPacket(packet: DataPacket): Promise<void> {
    await this.socket.handleDataPacket(packet)
    while (this.socket.reader!.contents.length > 0) {
      const key = this.contentKeys.shift()!
      const value = this.socket.reader!.contents.shift()!
      this.logger(`Storing: ${bytesToHex(key)}.  ${this.contentKeys.length} still streaming.`)
      await this.returnContent([value], [key])
    }
  }
}

export class OfferWriteRequest extends ContentWriteRequest {
  requestCode: RequestCode.OFFER_WRITE
  content: Uint8Array
  contentKeys: Uint8Array[]
  constructor(options: ContentRequestOptions) {
    super(options)
    this.requestCode = RequestCode.OFFER_WRITE
    this.content = options.content
    this.contentKeys = options.contentKeys
  }

  async init(): Promise<void> {
    this.socket.logger.extend('ContentRequest')('init() - Sending a SYN')
    await this.socket.sendSynPacket(this.socket.sndConnectionId)
  }
  async _handleSynPacket(): Promise<void> {
    throw new Error(`Should not receive SYN packet during OFFER_WRITE`)
  }
  async _handleStatePacket(packet: StatePacket): Promise<void> {
    this.socket.logger(`(${this.socket.state})socket.seqNr: ${this.socket.getSeqNr()}`)
    if (this.socket.state === ConnectionState.SynSent) {
      this.socket.setAckNr(packet.header.seqNr - 1)
      this.socket.setSeqNr(packet.header.ackNr + 1)
      this.socket.logger(
        `SYN-ACK received for OFFERACCEPT request with connectionId: ${packet.header.connectionId}.  Beginning DATA stream.`,
      )
      this.socket.setWriter(this.socket.getSeqNr())
    }
    await this.socket.handleStatePacket(packet.header.ackNr, packet.header.timestampMicroseconds)
  }
}

export type ContentRequestType =
  | FindContentReadRequest
  | FoundContentWriteRequest
  | OfferWriteRequest
  | AcceptReadRequest

export function createContentRequest(options: ContentRequestOptions): ContentRequestType {
  switch (options.requestCode) {
    case RequestCode.FINDCONTENT_READ:
      return new FindContentReadRequest(options)
    case RequestCode.FOUNDCONTENT_WRITE:
      return new FoundContentWriteRequest(options)
    case RequestCode.OFFER_WRITE:
      return new OfferWriteRequest(options)
    case RequestCode.ACCEPT_READ:
      return new AcceptReadRequest(options)
  }
}
