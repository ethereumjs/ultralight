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
    let sockets: UtpSocket[]
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
          [contentKeys[0]],
          [socket],
          socketKey,
          [undefined]
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
          [contentKeys[0]],
          [socket],
          socketKey,
          [undefined]
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
        if (contents === undefined) {
          throw new Error('No contents to write')
        }
        sndId = connectionId + 1
        rcvId = connectionId
        socketKey = createSocketKey(peerId, sndId, rcvId)
        // Instead of creating a socket for each piece of content,
        // We will now join all content into one bytestring sent over one socket
        // The individual pieces of content will be separated by a VARIANT PREFIX
        // The variant prefix will convey the length of the proceeding content
        // The compiler will separate the single stream into individual pieces of content
        // Whether this is done during the stream or after should be trivial to end result
        const packed = packWithVariantPrefix(contents)

        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, packed)!

        newRequest = new ContentRequest(
          ProtocolId.HistoryNetwork,
          requestCode,
          contentKeys,
          sockets,
          socketKey,
          contents
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
          sockets = contentKeys.map(() => {
            return this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId)!
          })
          newRequest = new ContentRequest(
            ProtocolId.HistoryNetwork,
            requestCode,
            contentKeys,
            sockets,
            socketKey,
            []
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
  ): UtpSocket | undefined {
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
        /*    if (packet.header.seqNr === 2) {
          this.logger(`SYN-ACK-ACK received for FINDCONTENT request.  Beginning DATA stream.`)
          // request.socket.ackNr = packet.header.seqNr
          request.socket.seqNr = request.socket.seqNr + 1
          request.socket.nextSeq = 3
          request.socket.nextAck = packet.header.ackNr + 1
          await request.writer?.start()
          await sendFinPacket(request.socket)
        } else {
          if (packet.header.extension === 1) {
            this.logger('SELECTIVE ACK RECEIVED')
            bitmask = (packet.header as SelectiveAckHeader).selectiveAckExtension.bitmask
            this.logger(`${Array.from(bitmask.values())}`)
          } else {
            request.socket.logger('Ack Packet Received.')
            request.socket.logger(
              `Expected... ${request.socket.nextSeq} - ${request.socket.nextAck}`
            )
            request.socket.logger(`Got........ ${packet.header.seqNr} - ${packet.header.ackNr}`)
          }
          // request.socket.ackNr = packet.header.seqNr
          // request.socket.seqNr = request.socket.seqNr + 1
          request.socket.nextSeq = packet.header.seqNr + 1
          request.socket.nextAck = packet.header.ackNr + 1
          await this.handleStatePacket(request.socket, packet)
        }*/
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
          request.socket.logger(
            `FIN Packet ACK received.  Closing Socket.  There are ${request.sockets.length} more pieces of content to send.`
          )
          if (request.sockets.length > 0) {
            this.logger(`Starting next Stream`)
            await request.init()
          }
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
    const streamer = async (content: Uint8Array) => {
      const contentKey = HistoryNetworkContentKeyUnionType.deserialize(request.contentKey)
      const decodedContent = contentKey.value as HistoryNetworkContentKey
      this.logger(
        'streaming',
        contentKey.selector === 4 ? 'an accumulator...' : contentKey.selector
      )
      const key = contentKey.selector > 2 ? decodedContent : decodedContent.blockHash
      this.logger(decodedContent)
      this.emit('Stream', 1, contentKey.selector, toHexString(key as Uint8Array), content)
    }
    let content
    try {
      switch (requestCode) {
        case RequestCode.FOUNDCONTENT_WRITE:
          throw new Error('Why did I get a FIN packet?')
        case RequestCode.FINDCONTENT_READ:
          content = await request.socket.handleFinPacket(packet)
          content && streamer(content)
          request.socket.logger(`Closing uTP Socket`)
          break
        case RequestCode.OFFER_WRITE:
          throw new Error('Why did I get a FIN packet?')
        case RequestCode.ACCEPT_READ:
          content = await request.socket.handleFinPacket(packet)
          content && streamer(content)
          request.socket.logger(`Closing uTP Socket`)
          if (request.sockets.length > 0) {
            request.socket = request.sockets.pop()!
            request.contentKey = request.contentKeys.pop()!
            await request.init()
          }
          break
      }
    } catch (err) {
      this.logger('Error processing FIN packet')
      this.logger(err)
    }
  }
}
