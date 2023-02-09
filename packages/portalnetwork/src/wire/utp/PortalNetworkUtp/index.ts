import { BitVectorType, toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import {
  ProtocolId,
  ConnectionState,
  Packet,
  PacketType,
  UtpSocket,
  bitmap,
  SelectiveAckHeader,
  Bytes32TimeStamp,
  UtpSocketType,
  startingNrs,
  HistoryNetworkContentKey,
  HistoryNetworkContentTypes,
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
} from '../../../index.js'
import ContentReader from '../Socket/ContentReader.js'
import ContentWriter from '../Socket/ContentWriter.js'
import { EventEmitter } from 'events'

export class PortalNetworkUTP extends EventEmitter {
  openContentRequest: Map<UtpSocketKey, ContentRequest> // TODO enable other networks
  logger: Debugger
  working: boolean

  constructor(logger: Debugger) {
    super()
    this.logger = logger.extend(`uTP`)
    this.openContentRequest = new Map()
    this.working = false
  }

  closeRequest(packet: Buffer, peerId: string) {
    const requestKey = this.getRequestKeyFromPortalMessage(packet, peerId)
    const request = this.openContentRequest.get(requestKey)
    if (request) {
      request.socket.sendResetPacket()
      this.logger.extend('CLOSING')(`Closing uTP request with ${peerId}`)
      request.close()
      this.openContentRequest.delete(requestKey)
    }
  }

  getRequestKeyFromPortalMessage(packetBuffer: Buffer, peerId: string): string {
    const connId = packetBuffer.readUInt16BE(2)
    const idA = connId + 1
    const idB = connId - 1
    const keyA = createSocketKey(peerId, connId, idA)
    const keyB = createSocketKey(peerId, idA, connId)
    const keyC = createSocketKey(peerId, idB, connId)
    const keyD = createSocketKey(peerId, connId, idB)
    for (const key of [keyA, keyB, keyC, keyD]) {
      if (this.openContentRequest.get(key) !== undefined) {
        return key
      }
    }
    throw new Error(
      `Cannot Find Open Request for socketKey ${keyA} or ${keyB} or ${keyC} or ${keyD}`
    )
  }

  createPortalNetworkUTPSocket(
    requestCode: RequestCode,
    remoteAddress: string,
    sndId: number,
    rcvId: number,
    content?: Uint8Array
  ): UtpSocket {
    const socket: UtpSocket = new UtpSocket({
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
      [RequestCode.FOUNDCONTENT_WRITE]: { sndId: id, rcvId: id + 1 },
      [RequestCode.FINDCONTENT_READ]: { sndId: id + 1, rcvId: id },
      [RequestCode.OFFER_WRITE]: { sndId: id + 1, rcvId: id },
      [RequestCode.ACCEPT_READ]: { sndId: id, rcvId: id + 1 },
    }
  }

  async handleNewRequest(params: INewRequest): Promise<ContentRequest> {
    const { contentKeys, peerId, connectionId, requestCode } = params
    const content = params.contents ? params.contents[0] : undefined
    const sndId = this.startingIdNrs(connectionId)[requestCode].sndId
    const rcvId = this.startingIdNrs(connectionId)[requestCode].rcvId
    const newRequest = new ContentRequest({
      protocolId: ProtocolId.HistoryNetwork,
      requestCode,
      socket: this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, content),
      socketKey: createSocketKey(peerId, sndId, rcvId),
      content: params.contents ? params.contents[0] : undefined,
      contentKeys,
    })
    this.openContentRequest.set(newRequest.socketKey, newRequest)
    this.logger(`Opening request with key: ${newRequest.socketKey}`)
    await newRequest.init()
    return newRequest
  }

  async handleUtpPacket(packetBuffer: Buffer, srcId: string): Promise<void> {
    const timeReceived = Bytes32TimeStamp()
    const requestKey = this.getRequestKeyFromPortalMessage(packetBuffer, srcId)
    const request = this.openContentRequest.get(requestKey)
    if (request) {
      request.socket._clearTimeout()
      const packet = Packet.fromBuffer(packetBuffer)
      request.socket.updateDelay(timeReceived, packet.header.timestampMicroseconds)

      switch (packet.header.pType) {
        case PacketType.ST_SYN:
          request.socket.logger(`Received ST_SYN   sndId: ${packet.header.connectionId}`)
          requestKey && (await this._handleSynPacket(request, packet))
          break
        case PacketType.ST_DATA:
          request.socket.logger(
            `Received ST_DATA to ${packet.header.connectionId}  seqNr: ${packet.header.seqNr}`
          )
          requestKey && (await this._handleDataPacket(request, packet))
          break
        case PacketType.ST_STATE:
          request.socket.logger(`Received ST_STATE ackNr: ${packet.header.ackNr}`)
          if (packet.header.extension === 1) {
            await this._handleSelectiveAckPacket(request, packet)
          } else {
            await this._handleStatePacket(request, packet)
          }
          break
        case PacketType.ST_RESET:
          request.socket.logger(`Received ST_RESET`)
          break
        case PacketType.ST_FIN:
          request.socket.logger(`Received ST_FIN   seqNr: ${packet.header.seqNr}`)
          requestKey && (await this._handleFinPacket(request, packet))
          break
        default:
          throw new Error(`Unknown Packet Type ${packet.header.pType}`)
      }
    }
  }

  async send(peerId: string, msg: Buffer, protocolId: ProtocolId) {
    this.emit('Send', peerId, msg, protocolId, true)
    return new Promise((resolve, reject) => {
      this.once('Sent', () => {
        resolve(true)
      })
    })
  }

  async _handleSynPacket(request: ContentRequest, packet: SynPacket): Promise<void> {
    this.logger(`SYN received to initiate stream for ${request.requestCode} request`)
    switch (request.requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
        request.socket.setSeqNr(packet.header.seqNr)
        request.socket.setWriter()
        break
      case RequestCode.ACCEPT_READ:
        request.socket.setReader(new ContentReader(2))
        break
      default:
        throw new Error('I send SYNs, I do not handle them.')
    }
    request.socket.setAckNr(packet.header.seqNr)
    await request.socket.handleSynPacket()
  }
  async _handleStatePacket(request: ContentRequest, packet: StatePacket): Promise<void> {
    const sentTime = request.socket.packetManager.congestionControl.outBuffer.get(
      packet.header.ackNr
    )
    const handle: Record<RequestCode, () => Promise<void>> = {
      [RequestCode.FOUNDCONTENT_WRITE]: async () => {
        if (packet.header.ackNr > request.socket.writer!.startingSeqNr) {
          request.socket.ackNrs = Object.keys(request.socket.writer!.dataChunks)
            .filter((n) => parseInt(n) <= packet.header.ackNr)
            .map((n) => parseInt(n))
        }
        if (request.socket.type === 'write' && sentTime != undefined) {
          const rtt = packet.header.timestampMicroseconds - sentTime
          request.socket.updateRTT(rtt)
          request.socket.packetManager.congestionControl.outBuffer.delete(packet.header.ackNr)
        }
        await request.socket.handleStatePacket(packet)
      },
      [RequestCode.FINDCONTENT_READ]: async () => {
        if (packet.header.ackNr === 0) {
          this.logger(`SYN-ACK received for FINDCONTENT request  Waiting for DATA.`)
          const startingSeqNr = request.socket.getSeqNr() + 1
          request.socket.setAckNr(packet.header.seqNr)
          request.socket.setReader(new ContentReader(startingSeqNr))
        } else {
          throw new Error('READ socket should not get acks')
        }
      },
      [RequestCode.OFFER_WRITE]: async () => {
        if (request.socket.getSeqNr() === 1) {
          request.socket.state = ConnectionState.Connected
          request.socket.ackNr = packet.header.seqNr - 1
          request.socket.setSeqNr(1)
          request.socket.logger(
            `SYN-ACK received for OFFERACCEPT request with connectionId: ${packet.header.connectionId}.  Beginning DATA stream.`
          )
          request.socket.setWriter()
        } else if (packet.header.ackNr === request.socket.finNr) {
          request.socket.logger(`FIN Packet ACK received.  Closing Socket.`)
          request.socket._clearTimeout()
        } else {
          request.socket.ackNrs = Object.keys(request.socket.writer!.dataChunks)
            .filter((n) => parseInt(n) <= packet.header.ackNr)
            .map((n) => parseInt(n))
          request.socket.logger(
            `ST_STATE (Ack) Packet Received.  SeqNr: ${packet.header.seqNr}, AckNr: ${packet.header.ackNr}`
          )
          if (sentTime != undefined) {
            const rtt = packet.header.timestampMicroseconds - sentTime
            request.socket.updateRTT(rtt)
            request.socket.packetManager.congestionControl.outBuffer.delete(packet.header.ackNr)
          }
          await request.socket.handleStatePacket(packet)
        }
      },
      [RequestCode.ACCEPT_READ]: async () => {
        throw new Error('Why did I get a STATE packet?')
      },
    }
    await handle[request.requestCode]()
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
      request.socket.ackNr
    )
    const acked = ackNrs.find((a) => !request.socket.ackNrs.includes(a))
    request.socket.logger(
      `ST_STATE (SELECTIVE_ACK) received with ackNr: ${
        packet.header.ackNr
      }, and a bitmask referencing ackNrs: ${ackNrs}.  Packet acks DATA packet seqNr: ${acked}.  Receive socket still waits for seqNr: ${
        packet.header.ackNr + 1
      }`
    )
    if (acked) {
      request.socket.packetManager.congestionControl.rtt =
        request.socket.packetManager.congestionControl.reply_micro -
        request.socket.packetManager.congestionControl.outBuffer.get(acked)!
      request.socket.packetManager.congestionControl.outBuffer.delete(acked)
      request.socket.ackNrs.push(acked)
    }
    switch (request.requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
      case RequestCode.OFFER_WRITE:
        if (ackNrs.length >= 3) {
          // If packet is more than 3 behind, assume it to be lost and resend.
          request.socket.writer!.seqNr = packet.header.ackNr + 1
        }
        await request.socket.handleStatePacket(packet)
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
        throw new Error(`Why did I get a DATA packet? to:${packet.header.connectionId}`)
    }
  }
  async _handleResetPacket(request: ContentRequest) {
    request.socket.close()
  }
  async _handleFinPacket(request: ContentRequest, packet: FinPacket) {
    const keys = request.contentKeys
    const streamer = async (content: Uint8Array) => {
      this.logger(`Decompressing stream into ${keys.length} pieces of content`)
      let contents = [content]
      if (request.requestCode === RequestCode.ACCEPT_READ) {
        contents = dropPrefixes(content)
      }
      if (keys.length < 1) {
        throw new Error('Missing content keys')
      }
      for (const [idx, k] of keys.entries()) {
        const decodedContentKey = {
          selector: k[0],
          blockHash: k.subarray(1),
        } as HistoryNetworkContentKey
        const _content = contents[idx]
        this.logger.extend(`FINISHED`)(
          `${idx + 1}/${keys.length} -- sending ${HistoryNetworkContentTypes[k[0]]} to database`
        )
        this.emit('Stream', k[0], toHexString(decodedContentKey.blockHash), _content)
      }
    }

    let content
    switch (request.requestCode) {
      case RequestCode.FINDCONTENT_READ:
      case RequestCode.ACCEPT_READ:
        content = await request.socket.handleFinPacket(packet)
        content && (await streamer(content))
        request.socket.logger(`Closing uTP Socket`)
        request.socket._clearTimeout()
        break
      case RequestCode.FOUNDCONTENT_WRITE:
      case RequestCode.OFFER_WRITE:
      default:
        this.logger('I send FIN not handle FIN')
        return false
    }
    return true
  }
}

export * from './ContentRequest.js'
export * from './types.js'
