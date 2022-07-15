import { toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import {
  bufferToPacket,
  ConnectionState,
  Packet,
  PacketType,
  randUint16,
  UtpSocket,
} from '../index.js'
import { ProtocolId } from '../../../index.js'
import {
  HistoryNetworkContentKey,
  HistoryNetworkContentKeyUnionType,
} from '../../../subprotocols/history/index.js'
import { sendFinPacket } from '../Packets/PacketSenders.js'
import { BasicUtp } from '../Protocol/BasicUtp.js'
import { ContentRequest } from './ContentRequest.js'
import { dropPrefixes, encodeWithVariantPrefix } from '../Utils/variantPrefix.js'

type UtpSocketKey = string

export enum RequestCode {
  FOUNDCONTENT_WRITE = 0,
  FINDCONTENT_READ = 1,
  OFFER_WRITE = 2,
  ACCEPT_READ = 3,
}

function createSocketKey(remoteAddr: string, sndId: number, rcvId: number) {
  return `${remoteAddr.slice(0, 5)}-${sndId}-${rcvId}`
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

  async send(peerId: string, msg: Buffer, protocolId: ProtocolId) {
    this.emit('Send', peerId, msg, protocolId, true)
  }

  async handleNewRequest(
    contentKeys: Uint8Array[],
    peerId: string,
    connectionId: number,
    requestCode: RequestCode,
    contents?: Uint8Array[]
  ) {
    let sndId: number
    let rcvId: number
    let socket: UtpSocket
    let socketKey: string
    let newRequest: ContentRequest
    switch (requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
        if (contents === undefined) {
          throw new Error('No contents to write')
        }
        sndId = connectionId
        rcvId = connectionId + 1
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, contents[0])!
        if (socket === undefined) {
          throw new Error('Error in Socket Creation')
        }
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new ContentRequest(
          ProtocolId.HistoryNetwork,
          requestCode,
          socket,
          socketKey,
          Uint8Array.from([]),
          contentKeys
        )
        if (this.openContentRequest[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openContentRequest[socketKey] = newRequest
          this.logger(`Opening request with key: ${socketKey}`)
          await newRequest.init()
        }
        break
      case RequestCode.FINDCONTENT_READ:
        sndId = connectionId + 1
        rcvId = connectionId
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId)!
        if (socket === undefined) {
          throw new Error('Error in Socket Creation')
        }
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new ContentRequest(
          ProtocolId.HistoryNetwork,
          requestCode,
          socket,
          socketKey,
          Uint8Array.from([]),
          contentKeys
        )
        if (this.openContentRequest[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openContentRequest[socketKey] = newRequest
          this.logger(`Opening request with key: ${socketKey}`)
          await newRequest.init()
        }
        break
      case RequestCode.OFFER_WRITE:
        if (contents === undefined || contents.length <= 0) {
          throw new Error('No contents to write')
        } else {
          this.logger(`Opening a uTP socket to send ${contents.length} pieces of content`)
        }
        sndId = connectionId + 1
        rcvId = connectionId
        socketKey = createSocketKey(peerId, sndId, rcvId)
        if (contents.length > 1) {
          this.logger(
            `Encoding ${contents.length} contents with VarInt prefix for stream as a single bytestring`
          )
          contents = [encodeWithVariantPrefix(contents)]
        }
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, contents[0])!
        newRequest = new ContentRequest(
          ProtocolId.HistoryNetwork,
          requestCode,
          socket,
          socketKey,
          contents[0]
        )

        if (this.openContentRequest[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openContentRequest[socketKey] = newRequest
          this.logger(`Opening request with key: ${socketKey}`)
          await newRequest.init()
        }

        break
      case RequestCode.ACCEPT_READ:
        sndId = connectionId
        rcvId = connectionId + 1
        socketKey = createSocketKey(peerId, sndId, rcvId)
        if (this.openContentRequest[socketKey]) {
          this.logger(`Request already Open`)
        } else {
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
        }
        break
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

  async handleUtpPacket(packetBuffer: Buffer, srcId: string): Promise<void> {
    const requestKey = this.getRequestKeyFromPortalMessage(packetBuffer, srcId)
    const request = this.openContentRequest[requestKey]
    const packet = bufferToPacket(packetBuffer)
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
        this.logger(`Unknown Packet Type ${packet.header.pType}`)
    }
  }

  getRequestKeyFromPortalMessage(packetBuffer: Buffer, peerId: string): string {
    const packet = bufferToPacket(packetBuffer)
    const connId = packet.header.connectionId
    const idA = connId + 1
    const idB = connId - 1
    const keyA = createSocketKey(peerId, connId, idA)
    const keyB = createSocketKey(peerId, idA, connId)
    const keyC = createSocketKey(peerId, connId, idB)
    const keyD = createSocketKey(peerId, idB, connId)
    if (this.openContentRequest[keyA] !== undefined) {
      return keyA
    } else if (this.openContentRequest[keyB] !== undefined) {
      return keyB
    } else if (this.openContentRequest[keyC] !== undefined) {
      return keyC
    } else if (this.openContentRequest[keyD] !== undefined) {
      return keyD
    } else {
      this.logger(`Cannot Find Open Request for socketKey ${keyA} or ${keyB} or ${keyC} or ${keyD}`)
      return ''
    }
  }

  async _handleSynPacket(request: ContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    let writer
    let reader
    try {
      switch (requestCode) {
        case RequestCode.FOUNDCONTENT_WRITE:
          this.logger(`SYN received to initiate stream for FINDCONTENT request`)
          this.logger(`Expected: 1-RANDOM`)
          this.logger(`Received: ${packet.header.seqNr} - ${packet.header.ackNr}`)
          request.socket.ackNr = packet.header.seqNr
          request.socket.seqNr = randUint16()
          writer = await this.createNewWriter(request.socket, request.socket.seqNr)
          request.writer = writer
          await this.sendSynAckPacket(request.socket)
          request.socket.nextSeq = request.socket.seqNr + 1
          request.socket.nextAck = packet.header.ackNr + 1
          await request.writer?.start()
          await sendFinPacket(request.socket)
          break
        case RequestCode.FINDCONTENT_READ:
          this.logger(`Why did I get a SYN?`)
          break
        case RequestCode.OFFER_WRITE:
          this.logger(`Why did I get a SYN?`)
          break
        case RequestCode.ACCEPT_READ:
          this.logger('SYN received to initiate stream for OFFER/ACCEPT request')
          request.socket.ackNr = packet.header.seqNr
          request.socket.nextSeq = 2
          request.socket.nextAck = packet.header.ackNr
          reader = await this.createNewReader(request.socket, 2)
          request.socket.reader = reader
          await this.handleSynPacket(request.socket, packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
  async _handleStatePacket(request: ContentRequest, packet: Packet): Promise<void> {
    const requestCode = request.requestCode
    switch (requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
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
          this.logger(`Expecting: ${request.socket.nextSeq} - ${request.socket.nextAck}`)
          this.logger(`Received: ${packet.header.seqNr} - ${packet.header.ackNr}`)
          this.handleStatePacket(request.socket, packet)
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
        this.logger('Why did I get a STATE packet?')
        break
    }
  }

  async _handleDataPacket(request: ContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    try {
      switch (requestCode) {
        case RequestCode.FOUNDCONTENT_WRITE:
          throw new Error('Why did I get a DATA packet?')
        case RequestCode.FINDCONTENT_READ:
          await this.handleDataPacket(request.socket, packet)
          break
        case RequestCode.OFFER_WRITE:
          throw new Error('Why did I get a DATA packet?')
        case RequestCode.ACCEPT_READ:
          await this.handleDataPacket(request.socket, packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
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
          this.logger.extend(`FINISHED`)(
            `${idx + 1}/${keys.length} -- sending ${
              contentKey.selector === 0
                ? `BlockHeader: "${toHexString(decodedContentKey.blockHash).slice(0, 10)}..."`
                : contentKey.selector === 1
                ? `BlockBody: "${toHexString(decodedContentKey.blockHash).slice(0, 10)}..."`
                : contentKey.selector === 2
                ? 'Receipt'
                : contentKey.selector === 3
                ? 'EpochAccumulator'
                : contentKey.selector === 4
                ? 'HeaderAccumulator'
                : 'Unknown Data type'
            } to database`
          )
          switch (contentKey.selector) {
            case 0:
            case 1:
            case 2:
              key = decodedContentKey.blockHash
              break
            case 4:
              key = undefined
              break
          }
          this.emit(
            'Stream',
            1,
            contentKey.selector,
            toHexString(key ?? Uint8Array.from([])),
            _content
          )
        })
      } else {
        this.logger(
          'streaming',
          contentKey.selector === 4 ? 'an accumulator...' : contentKey.selector
        )
        switch (contentKey.selector) {
          case 0:
          case 1:
          case 2:
            key = decodedContentKey.blockHash
            break
          case 4:
            key = undefined
            break
        }
        this.logger(decodedContentKey)
        this.emit(
          'Stream',
          1,
          contentKey.selector,
          toHexString(key ?? Uint8Array.from([])),
          content
        )
      }
    }

    let content
    try {
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
          throw new Error('Why did I get a FIN packet?')
      }
    } catch (err) {
      this.logger('Error processing FIN packet')
      this.logger(err)
    }
  }
}
