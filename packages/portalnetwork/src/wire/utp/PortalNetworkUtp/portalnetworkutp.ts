import { Discv5 } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import { bufferToPacket, Packet, PacketType, randUint16, UtpProtocol, _UTPSocket } from '..'
import { SubNetworkIds } from '../..'
import { HistoryNetworkContentKey, PortalNetwork } from '../../..'
import { BasicUtp } from './BasicUtp'
import { HistoryNetworkContentRequest } from './HistoryNetworkContentRequest'
import { sendSynAckPacket } from './PacketSenders'

type UtpRequestKey = string
type UtpSocketKey = string
enum RequestCode {
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
    this.protocol = new BasicUtp()
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
    type: `sender` | `receiver`,
    method: 'FINDCONTENT' | 'OFFERACCEPT' | 'FINDNODES',
    contentKey: HistoryNetworkContentKey,
    peerId: string,
    connectionId: number,
    content?: Uint8Array
  ) {
    const requestCode =
      type === 'sender' && method === 'FINDCONTENT'
        ? 0
        : type === 'receiver' && method === 'FINDCONTENT'
        ? 1
        : type === 'sender' && method === 'OFFERACCEPT'
        ? 2
        : type === 'receiver' && method === 'OFFERACCEPT'
        ? 3
        : 4

    const sndId =
      requestCode === 0
        ? connectionId
        : requestCode === 1
        ? connectionId + 1
        : requestCode === 2
        ? connectionId + 1
        : requestCode === 3
        ? connectionId
        : 0
    const rcvId = type === 'sender' ? sndId - 1 : sndId + 1
    const socketKey = createSocketKey(peerId, sndId, rcvId)
    const socket = this.createPortalNetworkUTPSocket(requestCode, peerId, sndId, rcvId, content)
    const newRequest: HistoryNetworkContentRequest = new HistoryNetworkContentRequest(
      requestCode,
      contentKey,
      content,
      socketKey,
      socket!
    )

    if (this.openHistoryNetworkRequests[socketKey]) {
      this.logger(`Request already Open`)
    } else {
      this.openHistoryNetworkRequests[socketKey] = newRequest
      newRequest.init()
    }
  }

  createPortalNetworkUTPSocket(
    requestCode: number,
    peerId: string,
    sndId: number,
    rcvId: number,
    content?: Uint8Array
  ): _UTPSocket | undefined {
    let socket: _UTPSocket
    switch (requestCode) {
      case 0:
        socket = this.protocol.createNewSocket(peerId, sndId, rcvId, 'write', content!)
        return socket
      case 1:
        socket = this.protocol.createNewSocket(peerId, sndId, rcvId, 'read')
        return socket
      case 2:
        socket = this.protocol.createNewSocket(peerId, sndId, rcvId, 'write', content)
        return socket
      case 3:
        socket = this.protocol.createNewSocket(peerId, sndId, rcvId, 'read')
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
        requestKey && (await this.handleSynPacket(request, packet))
        break
      case PacketType.ST_DATA:
        requestKey && (await this.handleDataPacket(request, packet))
        break
      case PacketType.ST_STATE:
        requestKey && (await this.handleStatePacket(request, packet))
        break
      case PacketType.ST_RESET:
        requestKey && (await this.handleResetPacket(request, packet))
        break
      case PacketType.ST_FIN:
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
    const requestCode = request.requestCode
    let startingSeqNr: number = 0
    try {
      switch (requestCode) {
        case 0:
          this.logger(`SYN received for FINDCONTENT request`)
          startingSeqNr = packet.header.seqNr
          await this.protocol.handleSynPacket(request.socket, packet, startingSeqNr)
          break
        case 1:
          this.logger(`Why did I get a SYN?`)
          break
        case 2:
          this.logger(`Why did I get a SYN?`)
          break
        case 3:
          this.logger('SYN received for OFFER/ACCEPT')
          startingSeqNr = packet.header.ackNr
          await this.protocol.handleSynPacket(request.socket, packet, startingSeqNr)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
  async handleStatePacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    if (requestCode === 0 && packet.header.ackNr === 1) {
      this.logger(`SYN-ACK received for FINDCONTENT request`)
      request.socket.startDataTransfer(request.content!)
    } else if (requestCode === 0 && packet.header.seqNr === 2) {
      this.logger('SYN-ACK-ACK packet received for OFFERACCEPT request.')
      request.socket.startDataTransfer(request.content!)
    } else if (requestCode === 0 && packet.header.seqNr === 1) {
      this.logger('SYN-ACK received for OFFERACCEPT request')
      request.socket.sendAckPacket()
    } else {
      try {
        switch (requestCode) {
          case 0:
            this.logger('ACK received for FINDCONTENT request')
            request.socket.handleStatePacket(packet)
            break
          case 1:
            throw new Error('Why did I get a STATE packet?')
          case 2:
            this.logger('ACK received for OFFERACCEPT request')
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
          this.logger('DATA packet received for FINDCONTENT request')
          request.socket.handleDataPacket(packet)
          break
        case 2:
          throw new Error('Why did I get a DATA packet?')
        case 3:
          this.logger('DATA packet received for FINDCONTENT request')
          request.socket.handleDataPacket(packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
  async handleResetPacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    try {
      switch (requestCode) {
        case 0:
          break
        case 1:
          break
        case 2:
          break
        case 3:
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
  async handleFinPacket(request: HistoryNetworkContentRequest, packet: Packet) {
    const requestCode = request.requestCode
    try {
      switch (requestCode) {
        case 0:
          throw new Error('Why did I get a FIN packet?')
        case 1:
          this.logger('FIN Packet Received for FINDCONTENT request')
          request.socket.handleFinPacket(packet)
          break
        case 2:
          throw new Error('Why did I get a FIN packet?')
        case 3:
          this.logger('FIN Packet Received for OFFERACCEPT request')
          request.socket.handleFinPacket(packet)
          break
      }
    } catch {
      this.logger('Request Type Not Implemented')
    }
  }
}
