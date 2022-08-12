import { toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import { ConnectionState, Packet, PacketType, randUint16, UtpSocket } from '../index.js'
import { ProtocolId } from '../../../index.js'
import {
  HistoryNetworkContentKey,
  HistoryNetworkContentKeyUnionType,
} from '../../../subprotocols/history/index.js'
import { sendFinPacket } from '../Packets/PacketSenders.js'
import { BasicUtp } from '../Protocol/BasicUtp.js'
import { ContentRequest } from './ContentRequest.js'
import { dropPrefixes, encodeWithVariantPrefix } from '../Utils/variantPrefix.js'
import ContentReader from '../Protocol/read/ContentReader.js'

type UtpSocketKey = string

export enum RequestCode {
  FOUNDCONTENT_WRITE = 0,
  FINDCONTENT_READ = 1,
  OFFER_WRITE = 2,
  ACCEPT_READ = 3,
}

export function createSocketKey(remoteAddr: string, sndId: number, rcvId: number) {
  return `${remoteAddr.slice(0, 5)}-${sndId}-${rcvId}`
}
export interface INewRequest {
  contentKeys: Uint8Array[]
  peerId: string
  connectionId: number
  requestCode: RequestCode
  contents?: Uint8Array[]
}
export class PortalNetworkUTP extends BasicUtp {
  openContentRequest: Record<UtpSocketKey, ContentRequest> // TODO enable other networks
  logger: Debugger
  working: boolean

  constructor(logger: Debugger) {
    super()
    this.logger = logger.extend(`uTP`)
    this.openContentRequest = {}
    this.working = false
  }

  getRequestKeyFromPortalMessage(packetBuffer: Buffer, peerId: string): string {
    const packet = Packet.bufferToPacket(packetBuffer)
    const connId = packet.header.connectionId
    const idA = connId + 1
    const idB = connId - 1
    const keyA = createSocketKey(peerId, connId, idA)
    const keyB = createSocketKey(peerId, idA, connId)
    const keyC = createSocketKey(peerId, idB, connId)
    if (this.openContentRequest[keyA] !== undefined) {
      return keyA
    } else if (this.openContentRequest[keyB] !== undefined) {
      return keyB
    } else if (this.openContentRequest[keyC] !== undefined) {
      return keyC
    } else {
      throw new Error(`Cannot Find Open Request for socketKey ${keyA} or ${keyB} or ${keyC}`)
    }
  }

  createPortalNetworkUTPSocket(
    requestCode: RequestCode,
    peerId: string,
    sndId: number,
    rcvId: number,
    content?: Uint8Array
  ): UtpSocket {
    let socket: UtpSocket
    switch (requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
        socket = this.createNewSocket(
          peerId,
          sndId,
          rcvId,
          randUint16(),
          0,
          1,
          undefined,
          'write',
          this.logger,
          content
        )
        return socket
      case RequestCode.FINDCONTENT_READ:
        socket = this.createNewSocket(
          peerId,
          sndId,
          rcvId,
          0,
          randUint16(),
          undefined,
          1,
          'read',
          this.logger
        )
        return socket
      case RequestCode.OFFER_WRITE:
        socket = this.createNewSocket(
          peerId,
          sndId,
          rcvId,
          1,
          randUint16(),
          undefined,
          1,
          'write',
          this.logger,
          content
        )
        return socket
      case RequestCode.ACCEPT_READ:
        socket = this.createNewSocket(
          peerId,
          sndId,
          rcvId,
          randUint16(),
          0,
          1,
          undefined,
          'read',
          this.logger
        )
        return socket
    }
  }

  async handleNewRequest(params: INewRequest): Promise<ContentRequest> {
    const { contentKeys, peerId, connectionId, requestCode } = params
    let contents = params.contents
    let sndId: number
    let rcvId: number
    let socket: UtpSocket
    let socketKey: string
    let newRequest: ContentRequest
    switch (requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
        sndId = connectionId
        rcvId = connectionId + 1
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, contents![0])!
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new ContentRequest(
          ProtocolId.HistoryNetwork,
          requestCode,
          socket,
          socketKey,
          Uint8Array.from([]),
          contentKeys
        )

        this.openContentRequest[socketKey] = newRequest
        this.logger(`Opening request with key: ${socketKey}`)
        await newRequest.init()
        break
      case RequestCode.FINDCONTENT_READ:
        sndId = connectionId + 1
        rcvId = connectionId
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId)!
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new ContentRequest(
          ProtocolId.HistoryNetwork,
          requestCode,
          socket,
          socketKey,
          Uint8Array.from([]),
          contentKeys
        )

        this.openContentRequest[socketKey] = newRequest
        this.logger(`Opening request with key: ${socketKey}`)
        await newRequest.init()
        break
      case RequestCode.OFFER_WRITE:
        this.logger(`Opening a uTP socket to send ${contents!.length} pieces of content`)

        sndId = connectionId + 1
        rcvId = connectionId
        socketKey = createSocketKey(peerId, sndId, rcvId)
        if (contents!.length > 1) {
          this.logger(
            `Encoding ${
              contents!.length
            } contents with VarInt prefix for stream as a single bytestring`
          )
          contents = [encodeWithVariantPrefix(contents!)]
        }
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, contents![0])!
        newRequest = new ContentRequest(
          ProtocolId.HistoryNetwork,
          requestCode,
          socket,
          socketKey,
          contents![0],
          contentKeys
        )

        this.openContentRequest[socketKey] = newRequest
        this.logger(`Opening request with key: ${socketKey}`)
        await newRequest.init()
        break
      default:
        //      case RequestCode.ACCEPT_READ:
        sndId = connectionId
        rcvId = connectionId + 1
        socketKey = createSocketKey(peerId, sndId, rcvId)

        this.logger(`Opening request with key: ${socketKey}`)
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId)!
        newRequest = new ContentRequest(
          ProtocolId.HistoryNetwork,
          requestCode,
          socket,
          socketKey,
          Uint8Array.from([]),
          contentKeys
        )
        this.openContentRequest[socketKey] = newRequest
        await newRequest.init()

        break
    }
    return newRequest
  }

  async handleUtpPacket(
    packetBuffer: Buffer,
    srcId: string
  ): Promise<{ request: ContentRequest; packet: Packet }> {
    const requestKey = this.getRequestKeyFromPortalMessage(packetBuffer, srcId)
    const request = this.openContentRequest[requestKey]
    const packet = Packet.bufferToPacket(packetBuffer)
    let returnPacket
    switch (packet.header.pType) {
      case PacketType.ST_SYN:
        this.logger(
          `SYN Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this._handleSynPacket(request, packet))
        break
      case PacketType.ST_DATA:
        this.logger(
          `DATA Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this._handleDataPacket(request, packet))
        break
      case PacketType.ST_STATE:
        this.logger(
          `STATE Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this._handleStatePacket(request, packet))
        break
      case PacketType.ST_RESET:
        this.logger(
          `RESET Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this._handleResetPacket(request))
        break
      case PacketType.ST_FIN:
        this.logger(
          `FIN Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this._handleFinPacket(request, packet))
        break
      default:
        throw new Error(`Unknown Packet Type ${packet.header.pType}`)
    }
    return { request, packet }
  }

  async send(peerId: string, msg: Buffer, protocolId: ProtocolId) {
    this.emit('Send', peerId, msg, protocolId, true)
  }

  async _handleSynPacket(request: ContentRequest, packet: Packet): Promise<Packet | ContentReader> {
    const requestCode = request.requestCode
    let writer
    let reader
    let r: Packet | ContentReader
    switch (requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
        this.logger(`SYN received to initiate stream for FINDCONTENT request`)
        request.socket.ackNr = packet.header.seqNr
        request.socket.seqNr = randUint16()
        await this.sendSynAckPacket(request.socket)
        writer = await this.createNewWriter(request.socket, request.socket.seqNr++)
        request.writer = writer
        request.socket.nextSeq = request.socket.seqNr + 1
        request.socket.nextAck = packet.header.ackNr + 1
        await request.writer?.start()
        r = await sendFinPacket(request.socket)
        break
      case RequestCode.ACCEPT_READ:
        this.logger('SYN received to initiate stream for OFFER/ACCEPT request')
        request.socket.ackNr = packet.header.seqNr
        request.socket.nextSeq = 2
        request.socket.nextAck = packet.header.ackNr + 1
        r = await this.createNewReader(request.socket, 2)
        request.socket.reader = r
        await this.sendSynAckPacket(request.socket)
        break
      default:
        throw new Error('I send SYNs, I do not handle them.')
    }
    return r
  }
  async _handleStatePacket(request: ContentRequest, packet: Packet): Promise<void> {
    const requestCode = request.requestCode
    switch (requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
        request.socket.ackNrs.includes(packet.header.ackNr) ||
          request.socket.ackNrs.push(packet.header.ackNr)
        break
      case RequestCode.FINDCONTENT_READ:
        if (packet.header.ackNr === 1) {
          this.logger(
            `SYN-ACK received for FINDCONTENT request.  Sending SYN-ACK-ACK.  Waiting for DATA.`
          )
          this.logger(`Expecting: RANDOM-1`)
          this.logger(`Received: ${packet.header.seqNr} - ${packet.header.ackNr}`)
          const startingSeqNr = request.socket.seqNr + 1
          request.socket.ackNr = packet.header.seqNr
          request.socket.seqNr = 2
          request.socket.nextSeq = packet.header.seqNr + 1
          request.socket.nextAck = packet.header.ackNr + 1
          const reader = await this.createNewReader(request.socket, startingSeqNr)
          request.reader = reader
          await this.sendStatePacket(request.socket)
        } else {
          throw new Error('READ socket should not get acks')
        }
        break
      case RequestCode.OFFER_WRITE:
        if (request.socket.seqNr === 1) {
          request.socket.state = ConnectionState.Connected
          request.socket.ackNr = packet.header.seqNr - 1
          request.socket.seqNr = 2
          request.socket.nextSeq = packet.header.seqNr + 1
          request.socket.nextAck = 2
          request.socket.logger(`SYN-ACK received for OFFERACCEPT request.  Beginning DATA stream.`)
          await request.writer?.start()
          await this.sendFinPacket(request.socket)
        } else if (packet.header.ackNr === request.socket.finNr) {
          request.socket.logger(`FIN Packet ACK received.  Closing Socket.`)
        } else {
          request.socket.logger('Ack Packet Received.')
          request.socket.logger(`Expected... ${request.socket.nextSeq} - ${request.socket.nextAck}`)
          request.socket.logger(`Got........ ${packet.header.seqNr} - ${packet.header.ackNr}`)
          //  request.socket.seqNr = request.socket.seqNr + 1
          request.socket.nextSeq = packet.header.seqNr + 1
          request.socket.nextAck = packet.header.ackNr + 1
          await this.handleStatePacket(request.socket, packet)
        }
        break
      case RequestCode.ACCEPT_READ:
        throw new Error('Why did I get a STATE packet?')
    }
  }
  async _handleDataPacket(request: ContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    let ack: Packet
    switch (requestCode) {
      case RequestCode.FINDCONTENT_READ:
        ack = await this.handleDataPacket(request.socket, packet)
        break
      case RequestCode.ACCEPT_READ:
        ack = await this.handleDataPacket(request.socket, packet)
        break
      default:
        throw new Error('Why did I get a DATA packet?')
    }

    return ack
  }
  async _handleResetPacket(request: ContentRequest) {
    const requestCode = request.requestCode
    delete this.openContentRequest[requestCode]
  }
  async _handleFinPacket(request: ContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    const keys = request.contentKeys
    const streamer = async (content: Uint8Array) => {
      let contentKey = HistoryNetworkContentKeyUnionType.deserialize(keys[0])
      let decodedContentKey = contentKey.value as HistoryNetworkContentKey
      let key: Uint8Array | undefined
      if (keys.length > 1) {
        this.logger(`Decompressing stream into ${keys.length} pieces of content`)
        const contents = dropPrefixes(content)
        keys.forEach((k, idx) => {
          contentKey = HistoryNetworkContentKeyUnionType.deserialize(k)
          decodedContentKey = contentKey.value as HistoryNetworkContentKey
          const _content = contents[idx]
          this.logger.extend(`FINISHED`)(`${idx + 1}/${keys.length} -- sending content to database`)
          this.emit(
            'Stream',
            1,
            contentKey.selector,
            toHexString(decodedContentKey.blockHash),
            _content
          )
        })
      } else {
        this.logger(
          'streaming',
          contentKey.selector === 4 ? 'an accumulator...' : contentKey.selector
        )
        switch (contentKey.selector) {
          case 4:
            key = HistoryNetworkContentKeyUnionType.serialize({
              selector: 4,
              value: { selector: 0, value: null },
            })
            break
          default:
            key = decodedContentKey.blockHash
            break
        }
        this.logger(decodedContentKey)
        this.emit('Stream', 1, contentKey.selector, toHexString(key), content)
      }
    }

    let content
    switch (requestCode) {
      case RequestCode.FINDCONTENT_READ:
      case RequestCode.ACCEPT_READ:
        content = await request.socket.handleFinPacket(packet)
        content && streamer(content)
        request.socket.logger(`Closing uTP Socket`)
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
