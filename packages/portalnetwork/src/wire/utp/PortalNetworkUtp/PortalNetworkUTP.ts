import { Discv5, toHex } from '@chainsafe/discv5'
import { toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import { bufferToPacket, Packet, PacketType, randUint16, UtpSocket } from '..'
import { SubNetworkIds } from '../..'
import { HistoryNetworkContentKeyUnionType, PortalNetwork } from '../../..'
import { sendFinPacket, sendSynAckPacket } from '../Packets/PacketSenders'
import { BasicUtp } from '../Protocol/BasicUtp'
import { HistoryNetworkContentRequest } from './HistoryNetworkContentRequest'

type UtpSocketKey = string

export enum RequestCode {
  FOUNDNDCONTENT_WRITE = 0,
  FINDCONTENT_READ = 1,
  OFFER_WRITE = 2,
  ACCECPT_READ = 3,
}

function createSocketKey(remoteAddr: string, sndId: number, rcvId: number) {
  return `${remoteAddr.slice(0, 5)}-${sndId}-${rcvId}`
}
export class PortalNetworkUTP {
  portal: PortalNetwork
  client: Discv5
  protocol: BasicUtp
  openHistoryNetworkRequests: Record<UtpSocketKey, HistoryNetworkContentRequest> // TODO enable other networks
  logger: Debugger

  constructor(portal: PortalNetwork) {
    this.portal = portal
    this.client = portal.client
    this.protocol = new BasicUtp((peerId: string, msg: Buffer, networkId: SubNetworkIds) =>
      this.sendPortalNetworkMessage(peerId, msg, networkId)
    )
    this.logger = portal.logger.extend(`uTP`)
    this.openHistoryNetworkRequests = {}
  }

  async sendPortalNetworkMessage(peerId: string, msg: Buffer, networkId: SubNetworkIds) {
    await this.portal.sendPortalNetworkMessage(peerId, msg, networkId, true)
  }

  /**
   * Handles a request from Portal Network Client for uTP
   * @param type sender or receiver
   * @param method portal network message type
   * @param contentKey contentKey of requested content
   * @param peerId Portal Network peer involved in transfer
   * @param connectionId Random Uint16 from Portal Network FOUNDCONTENT or ACCEPT talkResp
   * @param content SENDER: requested content from db
   */

  async handleNewHistoryNetworkRequest(
    contentKeys: Uint8Array[],
    peerId: string,
    connectionId: number,
    requestCode: RequestCode,
    contents?: Uint8Array[]
  ) {
    let sndId
    let rcvId
    let socket
    let socketKey
    let newRequest: HistoryNetworkContentRequest
    switch (requestCode) {
      case 0:
        if (contents === undefined) {
          throw new Error('No contents to write')
        }
        sndId = connectionId + 1
        rcvId = connectionId
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, contents[0])
        if (socket === undefined) {
          throw new Error('Error in Socket Creation')
        }
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new HistoryNetworkContentRequest(
          requestCode,
          [contentKeys[0]],
          socket,
          socketKey,
          [undefined]
        )
        if (this.openHistoryNetworkRequests[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openHistoryNetworkRequests[socketKey] = newRequest
          this.logger(`Opening request with key: ${socketKey}`)
          await newRequest.init()
        }
        break
      case 1:
        sndId = connectionId
        rcvId = connectionId + 1
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId)
        if (socket === undefined) {
          throw new Error('Error in Socket Creation')
        }
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new HistoryNetworkContentRequest(requestCode, contentKeys, socket, socketKey, [
          undefined,
        ])
        if (this.openHistoryNetworkRequests[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openHistoryNetworkRequests[socketKey] = newRequest
          this.logger(`Opening request with key: ${socketKey}`)
          await newRequest.init()
        }
        break
      case 2:
        if (contents === undefined) {
          throw new Error('No contents to write')
        }
        sndId = connectionId
        rcvId = connectionId + 1
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, contents[0])
        if (socket === undefined) {
          throw new Error('Error in Socket Creation')
        }
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new HistoryNetworkContentRequest(
          requestCode,
          [contentKeys[0]],
          socket,
          socketKey,
          [contents[0]]
        )
        if (this.openHistoryNetworkRequests[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openHistoryNetworkRequests[socketKey] = newRequest
          this.logger(`Opening request with key: ${socketKey}`)
          await newRequest.init()
        }
        break
      case 3:
        sndId = connectionId + 1
        rcvId = connectionId
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId)
        if (socket === undefined) {
          throw new Error('Error in Socket Creation')
        }
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new HistoryNetworkContentRequest(
          requestCode,
          contentKeys,
          socket,
          socketKey,
          []
        )
        if (this.openHistoryNetworkRequests[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openHistoryNetworkRequests[socketKey] = newRequest
          this.logger(`Opening request with key: ${socketKey}`)
          await newRequest.init()
        }
        break
    }
    // const rcvId = requestCode % 2 === 0 ? sndId - 1 : sndId + 1
    // const socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, content)
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
      case 0:
        socket = this.protocol.createNewSocket(
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
      case 1:
        socket = this.protocol.createNewSocket(
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
      case 2:
        socket = this.protocol.createNewSocket(
          peerId,
          sndId,
          rcvId,
          0,
          randUint16(),
          undefined,
          1,
          'write',
          this.logger,
          content
        )
        return socket
      case 3:
        socket = this.protocol.createNewSocket(
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
    const request = this.openHistoryNetworkRequests[requestKey]
    const packet = bufferToPacket(packetBuffer)
    switch (packet.header.pType) {
      case PacketType.ST_SYN:
        this.logger(
          `SYN Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this.handleSynPacket(request, packet))
        break
      case PacketType.ST_DATA:
        this.logger(
          `DATA Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this.handleDataPacket(request, packet))
        break
      case PacketType.ST_STATE:
        this.logger(
          `STATE Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this.handleStatePacket(request, packet))
        break
      case PacketType.ST_RESET:
        this.logger(
          `RESET Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this.handleResetPacket(request))
        break
      case PacketType.ST_FIN:
        this.logger(
          `FIN Packet received seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr}`
        )
        requestKey && (await this.handleFinPacket(request, packet))
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
    if (this.openHistoryNetworkRequests[keyA] !== undefined) {
      return keyA
    } else if (this.openHistoryNetworkRequests[keyB] !== undefined) {
      return keyB
    } else if (this.openHistoryNetworkRequests[keyC] !== undefined) {
      return keyC
    } else if (this.openHistoryNetworkRequests[keyD] !== undefined) {
      return keyD
    } else {
      this.logger(`Cannot Find Open Request for socketKey ${keyA} or ${keyB} or ${keyC} of ${keyD}`)
      return ''
    }
  }

  async handleSynPacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    let writer
    try {
      switch (requestCode) {
        case 0:
          this.logger(`SYN received to initiate stream for FINDCONTENT request`)
          this.logger(`Should be RANDOM-1`)
          this.logger(`${packet.header.seqNr} - ${packet.header.ackNr}`)
          request.socket.ackNr = packet.header.seqNr
          request.socket.seqNr = randUint16()
          writer = await this.protocol.createNewWriter(request.socket, request.socket.seqNr + 1)
          request.writer = writer
          await this.protocol.sendSynAckPacket(request.socket)
          break
        case 1:
          this.logger(`Why did I get a SYN?`)
          break
        case 2:
          this.logger(`Why did I get a SYN?`)
          break
        case 3:
          this.logger('SYN received to initiate stream for OFFER/ACCEPT request')
          request.socket.ackNr = 1
          await this.protocol.handleSynPacket(request.socket, packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
  async handleStatePacket(request: HistoryNetworkContentRequest, packet: Packet): Promise<void> {
    const requestCode = request.requestCode
    switch (requestCode) {
      case 0:
        if (packet.header.seqNr === 2) {
          this.logger(`SYN-ACK-ACK received for FINDCONTENT request.  Beginning DATA stream.`)
          request.socket.ackNr = packet.header.seqNr
          request.socket.seqNr = packet.header.ackNr + 1
          request.socket.nextSeq = 3
          request.socket.nextAck = packet.header.ackNr + 1
          await request.writer?.start()
          await sendFinPacket(request.socket)
        } else {
          request.socket.logger('Ack Packet Received.')
          request.socket.logger(`Expected... ${request.socket.nextSeq} - ${request.socket.nextAck}`)
          request.socket.logger(`Got........ ${packet.header.seqNr} - ${packet.header.ackNr}`)
          request.socket.ackNr = packet.header.seqNr
          request.socket.seqNr = packet.header.ackNr + 1
          request.socket.nextSeq = packet.header.seqNr + 1
          request.socket.nextAck = packet.header.ackNr + 1
          await this.protocol.handleStatePacket(request.socket, packet)
        }
        break
      case 1:
        if (packet.header.ackNr === 1) {
          this.logger(
            `SYN-ACK received for FINDCONTENT request.  Sending SYN-ACK-ACK.  Waiting for DATA.`
          )
          this.logger(`Expecting: RANDOM-1`)
          this.logger(`Received: ${packet.header.seqNr} - ${packet.header.ackNr}`)
          const streamer = async (content: Uint8Array) => {
            await this.portal.addContentToHistory(
              1,
              request.contentKey.selector,
              toHexString(request.contentKey.value.blockHash),
              content
            )
          }
          const startingSeqNr = request.socket.seqNr + 1
          request.socket.ackNr = packet.header.seqNr
          request.socket.seqNr = packet.header.ackNr + 1
          request.socket.nextSeq = packet.header.seqNr + 1
          request.socket.nextAck = packet.header.ackNr + 1
          const reader = await this.protocol.createNewReader(
            request.socket,
            startingSeqNr,
            streamer
          )
          request.reader = reader
          await this.protocol.sendStatePacket(request.socket)
        } else {
          this.logger(`Expecting: ${request.socket.nextSeq} - ${request.socket.nextAck}`)
          this.logger(`Received: ${packet.header.seqNr} - ${packet.header.ackNr}`)
          this.protocol.handleStatePacket(request.socket, packet)
        }
        break
      case 2:
        if (packet.header.ackNr === 1) {
          this.logger(`SYN-ACK received for OFFERACCEPT request.  Beginning DATA stream.`)
          await this.protocol.startDataTransfer(request.socket)
        } else {
          this.protocol.handleStatePacket(request.socket, packet)
        }
        break
      case 3:
        this.logger('Why did I get a STATE packet?')
        break
    }
  }

  async handleDataPacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    try {
      switch (requestCode) {
        case 0:
          throw new Error('Why did I get a DATA packet?')
        case 1:
          await this.protocol.handleDataPacket(request.socket, packet)
          break
        case 2:
          throw new Error('Why did I get a DATA packet?')
        case 3:
          request.socket.handleDataPacket(packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
  async handleResetPacket(request: HistoryNetworkContentRequest) {
    const requestCode = request.requestCode
    delete this.openHistoryNetworkRequests[requestCode]
    const newSocket = this.createPortalNetworkUTPSocket(
      requestCode,
      request.socket.remoteAddress,
      request.socket.sndConnectionId,
      request.socket.rcvConnectionId,
      request.content && request.content
    )
    const newRequest = new HistoryNetworkContentRequest(
      requestCode,
      [HistoryNetworkContentKeyUnionType.serialize(request.contentKey)],
      newSocket!,
      request.socketKey,
      request.content ? [request.content] : [undefined]
    )
    await newRequest.init()
  }
  async handleFinPacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    const streamer = async (content: Uint8Array) => {
      await this.portal.addContentToHistory(
        1,
        request.contentKey.selector,
        toHexString(request.contentKey.value.blockHash),
        content
      )
    }
    let content
    try {
      switch (requestCode) {
        case 0:
          throw new Error('Why did I get a FIN packet?')
        case 1:
          content = await request.socket.handleFinPacket(packet)
          streamer(content!)
          request.socket.logger(`Closing uTP Socket`)
          break
        case 2:
          throw new Error('Why did I get a FIN packet?')
        case 3:
          await request.socket.handleFinPacket(packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
}
