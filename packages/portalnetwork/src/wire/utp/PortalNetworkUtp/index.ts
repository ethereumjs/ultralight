import { BitVectorType, toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import {
  ProtocolId,
  Packet,
  PacketType,
  UtpSocket,
  bitmap,
  SelectiveAckHeader,
  Bytes32TimeStamp,
  UtpSocketType,
  startingNrs,
  ContentType,
  ContentRequest,
  dropPrefixes,
  FinPacket,
  DataPacket,
  StatePacket,
  SynPacket,
  createSocketKey,
  INewRequest,
  RequestCode,
  UtpSocketKey,
  decodeContentKey,
} from '../../../index.js'
import { EventEmitter } from 'events'

export class PortalNetworkUTP extends EventEmitter {
  openContentRequest: Map<UtpSocketKey, ContentRequest>
  logger: Debugger
  working: boolean

  constructor(logger: Debugger) {
    super()
    this.logger = logger.extend(`uTP`)
    this.openContentRequest = new Map()
    this.working = false
  }

  closeRequest(connectionId: number, peerId: string) {
    const requestKey = this.getRequestKey(connectionId, peerId)
    const request = this.openContentRequest.get(requestKey)
    if (request) {
      request.socket.sendResetPacket()
      this.logger.extend('CLOSING')(`Closing uTP request with ${peerId}`)
      request.close()
      this.openContentRequest.delete(requestKey)
    }
  }

  getRequestKey(connId: number, peerId: string): string {
    const idA = connId + 1
    const idB = connId - 1
    const keyA = createSocketKey(peerId, connId)
    const keyB = createSocketKey(peerId, idA)
    const keyC = createSocketKey(peerId, idB)
    for (const key of [keyA, keyB, keyC]) {
      if (this.openContentRequest.get(key) !== undefined) {
        return key
      }
    }
    throw new Error(`Cannot Find Open Request for socketKey ${keyA} or ${keyB} or ${keyC}`)
  }

  createPortalNetworkUTPSocket(
    protocolId: ProtocolId,
    requestCode: RequestCode,
    remoteAddress: string,
    sndId: number,
    rcvId: number,
    content?: Uint8Array,
  ): UtpSocket {
    const socket: UtpSocket = new UtpSocket({
      protocolId,
      remoteAddress,
      sndId,
      rcvId,
      seqNr: startingNrs[requestCode].seqNr,
      ackNr: startingNrs[requestCode].ackNr,
      type: requestCode % 2 === 0 ? UtpSocketType.WRITE : UtpSocketType.READ,
      logger: this.logger,
      content,
    })
    socket.on('send', async (remoteAddr, msg, protocolId) => {
      await this.send(remoteAddr, msg, protocolId)
      socket.emit('sent')
    })
    return socket
  }

  startingIdNrs(id: number): Record<RequestCode, { sndId: number; rcvId: number }> {
    return {
      [RequestCode.FOUNDCONTENT_WRITE]: { sndId: id + 1, rcvId: id },
      [RequestCode.FINDCONTENT_READ]: { sndId: id, rcvId: id + 1 },
      [RequestCode.OFFER_WRITE]: { sndId: id, rcvId: id + 1 },
      [RequestCode.ACCEPT_READ]: { sndId: id + 1, rcvId: id },
    }
  }

  async handleNewRequest(params: INewRequest): Promise<ContentRequest> {
    const { contentKeys, peerId, connectionId, requestCode } = params
    const content = params.contents ? params.contents[0] : undefined
    const sndId = this.startingIdNrs(connectionId)[requestCode].sndId
    const rcvId = this.startingIdNrs(connectionId)[requestCode].rcvId
    const newRequest = new ContentRequest({
      protocolId: params.protocolId,
      requestCode,
      socket: this.createPortalNetworkUTPSocket(
        params.protocolId,
        requestCode,
        peerId,
        sndId,
        rcvId,
        content,
      ),
      socketKey: createSocketKey(peerId, connectionId),
      content: params.contents ? params.contents[0] : undefined,
      contentKeys,
    })
    this.openContentRequest.set(newRequest.socketKey, newRequest)
    this.logger(`Opening request with key: ${newRequest.socketKey}`)
    this.logger(`{ socket.sndId: ${sndId}, socket.rcvId: ${rcvId} }`)
    await newRequest.init()
    return newRequest
  }

  async handleUtpPacket(packetBuffer: Buffer, srcId: string): Promise<void> {
    const timeReceived = Bytes32TimeStamp()
    const requestKey = this.getRequestKey(packetBuffer.readUint16BE(2), srcId)
    const request = this.openContentRequest.get(requestKey)
    if (request) {
      request.socket._clearTimeout()
      const packet = Packet.fromBuffer(packetBuffer)
      request.socket.updateDelay(timeReceived, packet.header.timestampMicroseconds)
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
          requestKey && (await this._handleSynPacket(request, packet))
          break
        case PacketType.ST_DATA:
          requestKey && (await this._handleDataPacket(request, packet))
          break
        case PacketType.ST_STATE:
          if (packet.header.extension === 1) {
            await this._handleSelectiveAckPacket(request, packet)
          } else {
            await this._handleStatePacket(request, packet)
          }
          break
        case PacketType.ST_RESET:
          break
        case PacketType.ST_FIN:
          requestKey && (await this._handleFinPacket(request, packet))
          break
        default:
          throw new Error(`Unknown Packet Type ${packet.header.pType}`)
      }
    }
  }

  async send(peerId: string, msg: Buffer, protocolId: ProtocolId) {
    this.emit('Send', peerId, msg, protocolId, true)
    return new Promise((resolve, _reject) => {
      this.once('Sent', () => {
        resolve(true)
      })
    })
  }

  async _handleSynPacket(request: ContentRequest, packet: SynPacket): Promise<void> {
    this.logger(`SYN received to initiate stream for ${RequestCode[request.requestCode]} request`)
    switch (request.requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
      case RequestCode.ACCEPT_READ:
        await request.socket.handleSynPacket(packet.header.seqNr)
        break
      default:
        throw new Error('I send SYNs, I do not handle them.')
    }
  }
  async _handleStatePacket(request: ContentRequest, packet: StatePacket): Promise<void> {
    switch (request.requestCode) {
      case RequestCode.FINDCONTENT_READ: {
        if (packet.header.seqNr === request.socket.getSeqNr() - 1) {
          request.socket.setAckNr(packet.header.seqNr)
          break
        } else {
          throw new Error('READ socket should not get acks')
        }
      }
      case RequestCode.FOUNDCONTENT_WRITE:
        break
      case RequestCode.OFFER_WRITE:
        request.socket.logger(`socket.seqNr: ${request.socket.getSeqNr()}`)
        if (packet.header.seqNr === request.socket.finNr) {
          break
        }
        if (packet.header.ackNr === request.socket.getSeqNr()) {
          request.socket.setAckNr(packet.header.seqNr - 1)
          request.socket.setSeqNr(packet.header.ackNr + 1)
          request.socket.logger(
            `SYN-ACK received for OFFERACCEPT request with connectionId: ${packet.header.connectionId}.  Beginning DATA stream.`,
          )
          request.socket.setWriter(request.socket.getSeqNr())
        }
        break
      case RequestCode.ACCEPT_READ:
      default:
        throw new Error('Why did I get a STATE packet?')
    }
    await request.socket.handleStatePacket(packet.header.ackNr, packet.header.timestampMicroseconds)
  }
  public static bitmaskToAckNrs(bitmask: Uint8Array, ackNr: number): number[] {
    const bitArray = new BitVectorType(32).deserialize(bitmask)
    const ackNrs = bitArray.getTrueBitIndexes().map((index) => {
      return bitmap[index] + ackNr
    })
    return ackNrs
  }
  async _handleSelectiveAckPacket(request: ContentRequest, packet: StatePacket): Promise<void> {
    const ackNrs = PortalNetworkUTP.bitmaskToAckNrs(
      (packet.header as SelectiveAckHeader).selectiveAckExtension.bitmask,
      request.socket.ackNr,
    )
    const acked = ackNrs.find((a) => !request.socket.ackNrs.includes(a))
    request.socket.logger(
      `ST_STATE (SELECTIVE_ACK) received with ackNr: ${
        packet.header.ackNr
      }, and a bitmask referencing ackNrs: ${ackNrs}.  Packet acks DATA packet seqNr: ${acked}.  Receive socket still waits for seqNr: ${
        packet.header.ackNr + 1
      }`,
    )
    if (acked) {
      request.socket.updateRTT(packet.header.timestampMicroseconds, acked)
      request.socket.ackNrs.push(acked)
    }
    switch (request.requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
      case RequestCode.OFFER_WRITE:
        if (ackNrs.length >= 3) {
          // If packet is more than 3 behind, assume it to be lost and resend.
          request.socket.writer!.seqNr = packet.header.ackNr + 1
        }
        await request.socket.handleStatePacket(
          packet.header.ackNr,
          packet.header.timestampMicroseconds,
        )
        return
      default:
        throw new Error('Why did I get a SELECTIVE ACK packet?')
    }
  }
  async _handleDataPacket(request: ContentRequest, packet: DataPacket) {
    switch (request.requestCode) {
      case RequestCode.FINDCONTENT_READ:
      case RequestCode.ACCEPT_READ:
        return await request.socket.handleDataPacket(packet)
      default:
        throw new Error(`Why did I get a DATA packet?`)
    }
  }
  async _handleResetPacket(request: ContentRequest) {
    request.socket.close()
  }
  async _handleFinPacket(request: ContentRequest, packet: FinPacket) {
    const keys = request.contentKeys
    const content = await request.socket.handleFinPacket(packet)
    let contents = [content]
    if (request.requestCode === RequestCode.ACCEPT_READ) {
      contents = dropPrefixes(content)
    }
    await this.returnContent(contents, keys)
  }
  async returnContent(contents: Uint8Array[], keys: Uint8Array[]) {
    this.logger(`Decompressing stream into ${keys.length} pieces of content`)
    for (const [idx, k] of keys.entries()) {
      const decodedContentKey = decodeContentKey(toHexString(k))
      const _content = contents[idx]
      this.logger.extend(`FINISHED`)(
        `${idx + 1}/${keys.length} -- (${_content.length} bytes) sending ${
          ContentType[k[0]]
        } to database`,
      )
      if (_content.length === 0) {
        this.logger.extend(`FINISHED`)(`Missing content...`)
        continue
      } else {
        this.emit('Stream', k[0], decodedContentKey.blockHash, _content)
      }
    }
  }
}

export * from './ContentRequest.js'
export * from './types.js'
