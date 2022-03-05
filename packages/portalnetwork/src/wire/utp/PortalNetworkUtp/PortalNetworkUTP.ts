import { Discv5 } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import { bufferToPacket, Packet, PacketType, UtpSocket } from '..'
import { SubNetworkIds } from '../..'
import { HistoryNetworkContentKeyUnionType, PortalNetwork } from '../../..'
import { BasicUtp } from './BasicUtp'
import { HistoryNetworkContentRequest } from './HistoryNetworkContentRequest'

type UtpSocketKey = string
export enum RequestCode {
  FOUNDNDCONTENT_WRITE = 0,
  FINDCONTENT_READ = 1,
  OFFER_WRITE = 2,
  ACCECPT_READ = 3,
}

function createSocketKey(remoteAddr: string, sndId: number, rcvId: number) {
  return remoteAddr + sndId + rcvId
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
    this.protocol = new BasicUtp(this.sendPortalNetworkMessage)
    this.logger = portal.logger.extend(`uTP`)
    this.openHistoryNetworkRequests = {}
  }

  async sendPortalNetworkMessage(peerId: string, msg: Buffer, networkId: SubNetworkIds) {
    await this.portal.sendPortalNetworkMessage(peerId, msg, networkId)
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
    let socket: UtpSocket
    let socketKey
    let newRequest: HistoryNetworkContentRequest
    switch (requestCode) {
      case 0:
        sndId = connectionId + 1
        rcvId = connectionId
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, contents![0])!
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new HistoryNetworkContentRequest(
          requestCode,
          contentKeys[0],
          socket,
          socketKey,
          contents![0]
        )
        if (this.openHistoryNetworkRequests[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openHistoryNetworkRequests[socketKey] = newRequest
          await newRequest.init()
        }
        break
      case 1:
        sndId = connectionId
        rcvId = connectionId + 1
        socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId)!
        socketKey = createSocketKey(peerId, sndId, rcvId)
        newRequest = new HistoryNetworkContentRequest(
          requestCode,
          contentKeys[0],
          socket,
          socketKey
        )
        if (this.openHistoryNetworkRequests[socketKey]) {
          this.logger(`Request already Open`)
        } else {
          this.openHistoryNetworkRequests[socketKey] = newRequest
          await newRequest.init()
        }
        break
      case 2:
        contents?.forEach(async (content, idx) => {
          sndId = connectionId
          rcvId = connectionId + 1
          socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, content)!
          socketKey = createSocketKey(peerId, sndId, rcvId)
          newRequest = new HistoryNetworkContentRequest(
            requestCode,
            contentKeys[idx],
            socket,
            socketKey,
            contents![0]
          )
          if (this.openHistoryNetworkRequests[socketKey]) {
            this.logger(`Request already Open`)
          } else {
            this.openHistoryNetworkRequests[socketKey] = newRequest
            await newRequest.init()
          }
        })
        break
      case 3:
        contentKeys.forEach(async (key) => {
          sndId = connectionId + 1
          rcvId = connectionId
          socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId)!
          socketKey = createSocketKey(peerId, sndId, rcvId)
          newRequest = new HistoryNetworkContentRequest(requestCode, key, socket, socketKey)
          if (this.openHistoryNetworkRequests[socketKey]) {
            this.logger(`Request already Open`)
          } else {
            this.openHistoryNetworkRequests[socketKey] = newRequest
            await newRequest.init()
          }
        })
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
        socket = this.protocol.createNewSocket(peerId, sndId, rcvId, 'write', this.logger, content)
        return socket
      case 1:
        socket = this.protocol.createNewSocket(peerId, sndId, rcvId, 'read', this.logger)
        return socket
      case 2:
        socket = this.protocol.createNewSocket(peerId, sndId, rcvId, 'write', this.logger, content)
        return socket
      case 3:
        socket = this.protocol.createNewSocket(peerId, sndId, rcvId, 'read', this.logger)
        return socket
      default:
        return undefined
    }
  }

  async handleUtpPacket(packetBuffer: Buffer, srcId: string): Promise<void> {
    const requestKey = this.getRequestKeyFromPortalMessage(packetBuffer, srcId)
    const request = this.openHistoryNetworkRequests[requestKey!]
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
    }
  }

  getRequestKeyFromPortalMessage(packetBuffer: Buffer, peerId: string) {
    const packet = bufferToPacket(packetBuffer)
    const connId = packet.header.connectionId
    const send = createSocketKey(peerId, connId, connId + 1)
    const rcv = createSocketKey(peerId, connId, connId - 1)
    if (this.openHistoryNetworkRequests[send]) {
      return send
    } else if (this.openHistoryNetworkRequests[rcv]) {
      return rcv
    } else {
      this.logger('Cannot Find Open Request for this message')
    }
  }

  async handleSynPacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const key = HistoryNetworkContentKeyUnionType.deserialize(request.contentKey)
    const type = key.selector
    const requestCode = request.requestCode
    let startingSeqNr: number = 0
    let streamer
    let reader
    let writer
    try {
      switch (requestCode) {
        case 0:
          this.logger(`SYN received to initiate stream for FINDCONTENT request`)
          startingSeqNr = packet.header.seqNr
          streamer = (content: Uint8Array) => {
            this.portal.emit('Stream', 0, content, type, key.value.blockHash)
          }
          reader = this.protocol.createNewReader(request.socket, startingSeqNr, streamer)
          request.reader = reader
          await this.protocol.handleSynPacket(request.socket, packet)
          break
        case 1:
          this.logger(`Why did I get a SYN?`)
          break
        case 2:
          this.logger(`Why did I get a SYN?`)
          break
        case 3:
          this.logger('SYN received to initiate stream for OFFER/ACCEPT request')
          startingSeqNr = packet.header.ackNr
          writer = this.protocol.createNewWriter(request.socket, startingSeqNr)
          request.writer = writer
          await this.protocol.handleSynPacket(request.socket, packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
  async handleStatePacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    if (requestCode === 0 && packet.header.ackNr === 1) {
      this.logger(`SYN-ACK received.  Beginning DATA stream`)
      await request.socket.startDataTransfer(request.content!, request.writer!)
    } else if (requestCode === 2 && packet.header.ackNr === 1) {
      this.logger(
        'SYN-ACK received for OFFERACCEPT request.  Sending SYN-ACK-ACK and listening for DATA'
      )
      this.protocol.handleStatePacket(request.socket, packet)
    } else if (requestCode === 3 && packet.header.seqNr === 2) {
      this.logger('SYN-ACK-ACK packet received.  Beginning DATA stream.')
      await request.socket.startDataTransfer(request.content!, request.writer!)
    } else {
      try {
        switch (requestCode) {
          case 0:
            request.socket.handleStatePacket(packet)
            break
          case 1:
            throw new Error('Why did I get a STATE packet?')
          case 2:
            request.socket.handleStatePacket(packet)
            break
          case 3:
            throw new Error('Why did I get a STATE packet?')
        }
      } catch {
        this.logger('Request Type Not Implemented')
      }
    }
  }

  async handleDataPacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    try {
      switch (requestCode) {
        case 0:
          throw new Error('Why did I get a DATA packet?')
        case 1:
          request.socket.handleDataPacket(packet)
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
      request.contentKey,
      newSocket!,
      request.socketKey,
      request.content ?? request.content
    )
    await newRequest.init()
  }
  async handleFinPacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    try {
      switch (requestCode) {
        case 0:
          throw new Error('Why did I get a FIN packet?')
        case 1:
          request.socket.handleFinPacket(packet)
          break
        case 2:
          throw new Error('Why did I get a FIN packet?')
        case 3:
          request.socket.handleFinPacket(packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
}
