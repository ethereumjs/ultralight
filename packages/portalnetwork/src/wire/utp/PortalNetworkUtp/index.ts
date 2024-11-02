import type {
  ContentRequestType,
  INewRequest,
  INodeAddress,
  PortalNetwork,
} from '../../../index.js'
import {
  NetworkNames,
  NetworkId,
  Packet,
  PacketType,
  RequestCode,
  UtpSocketType,
  createContentRequest,
  startingNrs,
} from '../../../index.js'
import { createUtpSocket } from '../Socket/index.js'

import type { ENR } from '@chainsafe/enr'
import type { Debugger } from 'debug'
import type { SocketType } from '../Socket/index.js'
import { RequestManager } from './requestManager.js'

export class PortalNetworkUTP {
  client: PortalNetwork
  logger: Debugger
  working: boolean
  requestManagers: Record<string, RequestManager>

  constructor(client: PortalNetwork) {
    this.client = client
    this.logger = client.logger.extend(`uTP`)
    this.working = false
    this.requestManagers = {}
  }

   closeAllPeerRequests(nodeId: string) {
     this.requestManagers[nodeId].closeAllRequests()
  }

  hasRequests(nodeId: string): boolean {
    return this.requestManagers[nodeId] !== undefined && Object.keys(this.requestManagers[nodeId].requestMap).length > 0
  }

  openRequests(): number {
    return Object.keys(this.requestManagers).reduce((acc, nodeId) => {
      return acc + Object.keys(this.requestManagers[nodeId].requestMap).length
    }, 0)
  }

  createPortalNetworkUTPSocket(
    networkId: NetworkId,
    requestCode: RequestCode,
    enr: ENR | INodeAddress,
    connectionId: number,
    sndId: number,
    rcvId: number,
    content?: Uint8Array,
  ): SocketType {
    const type =
      requestCode === RequestCode.FINDCONTENT_READ
        ? UtpSocketType.READ
        : requestCode === RequestCode.ACCEPT_READ
          ? UtpSocketType.READ
          : UtpSocketType.WRITE
    const socket: SocketType = createUtpSocket({
      utp: this,
      networkId,
      enr,
      sndId,
      rcvId,
      seqNr: startingNrs[requestCode].seqNr,
      ackNr: startingNrs[requestCode].ackNr,
      connectionId,
      type,
      logger: this.logger,
      content,
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

  async handleNewRequest(params: INewRequest): Promise<ContentRequestType> {
    const { contentKeys, enr, connectionId, requestCode } = params
    if (this.requestManagers[enr.nodeId] === undefined) {
      this.requestManagers[enr.nodeId] = new RequestManager(enr.nodeId, this.logger)
    }
    const content = params.contents ?? new Uint8Array()
    const sndId = this.startingIdNrs(connectionId)[requestCode].sndId
    const rcvId = this.startingIdNrs(connectionId)[requestCode].rcvId
    const socket = this.createPortalNetworkUTPSocket(
      params.networkId,
      requestCode,
      enr,
      connectionId,
      sndId,
      rcvId,
      content,
    )
    const network = this.client.networks.get(params.networkId)!
    const newRequest = createContentRequest({
      requestManager: this.requestManagers[enr.nodeId],
      network,
      requestCode,
      socket,
      connectionId,
      content,
      contentKeys,
    })
    await this.requestManagers[enr.nodeId].handleNewRequest(connectionId, newRequest)
    this.logger.extend('utpRequest')(`New ${RequestCode[requestCode]} Request with ${enr.nodeId} -- ConnectionId: ${connectionId}`)
    this.logger.extend('utpRequest')(`Open Requests: ${this.openRequests()}`)
    return newRequest
  }

  async handleUtpPacket(packetBuffer: Uint8Array, srcId: INodeAddress): Promise<void> {
    if (this.requestManagers[srcId.nodeId] === undefined) {
      throw new Error(`No request manager for ${srcId.nodeId}`)
    }
    try {
      await this.requestManagers[srcId.nodeId].handlePacket(packetBuffer)
    } catch (err: any) {
      switch (err.message) {
        case `REQUEST_CLOSED`: {
          // Packet arrived after request was closed.  Send RESET packet to peer.
          const packet = Packet.fromBuffer(packetBuffer)
          const resetPacket = new Packet({
            header: {
              connectionId: packet.header.connectionId,
              pType: PacketType.ST_RESET,
              ackNr: 0,
              extension: 0,
              version: 0,
              timestampMicroseconds: 0,
              timestampDifferenceMicroseconds: 0,
              seqNr: 0,
              wndSize: 0,
            },
          })
          await this.send(srcId, resetPacket.encode(), NetworkId.UTPNetwork)
          break
        }
        case `REQUEST_NOT_FOUND`: {
          // Packet arrived for non-existent request.  Treat as spam and blacklist peer.
          this.client.addToBlackList(srcId.socketAddr)
          break
        }
        default: {
          throw err
        }
      }
    }
  }

  async send(enr: ENR | INodeAddress, msg: Uint8Array, networkId: NetworkId) {
    try {
      await this.client.sendPortalNetworkMessage(enr, msg, networkId, true)
      if (this.client.metrics) {
        const utpMetric = (NetworkNames[networkId] +
          '_utpPacketsSent') as keyof PortalNetworkMetrics
        this.client.metrics[utpMetric].inc()
      }
    } catch (err) {
      this.logger.extend('error')(`Error sending message to ${enr.nodeId}: ${err}`)
      this.closeAllPeerRequests(enr.nodeId)
      this.logger.extend('utpRequest')(`Open Requests: ${this.openRequests()}`)
      throw err
    }
  }
}

export * from './ContentRequest.js'
export * from './types.js'
