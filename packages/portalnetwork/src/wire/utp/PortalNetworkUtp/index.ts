import {
  RequestCode,
  UtpSocketType,
  createContentRequest,
  startingNrs,
} from '../../../index.js'
import { createUtpSocket } from '../Socket/index.js'

import type { ENR } from '@chainsafe/enr'
import type { Debugger } from 'debug'
import type {
  ContentRequestType,
  INewRequest,
  INodeAddress,
  NetworkId,
  PortalNetwork,
  } from '../../../index.js'
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

  createPortalNetworkUTPSocket(
    networkId: NetworkId,
    requestCode: RequestCode,
    enr: ENR | INodeAddress,
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
    const content = params.contents ?? new Uint8Array()
    const sndId = this.startingIdNrs(connectionId)[requestCode].sndId
    const rcvId = this.startingIdNrs(connectionId)[requestCode].rcvId
    const socketKey = createSocketKey(enr.nodeId, connectionId)
    const socket = this.createPortalNetworkUTPSocket(
      params.networkId,
      requestCode,
      enr,
      sndId,
      rcvId,
      content,
    )
    const network = this.client.networks.get(params.networkId)!
    const newRequest = createContentRequest({
      network,
      requestCode,
      socket,
      socketKey,
      content,
      contentKeys,
    })
    this.openContentRequest.set(newRequest.socketKey, newRequest)
    this.logger(`Opening ${RequestCode[requestCode]} request with key: ${newRequest.socketKey}`)
    this.logger(`{ socket.sndId: ${sndId}, socket.rcvId: ${rcvId} }`)
    await newRequest.init()
    return newRequest
  }

  async handleUtpPacket(packetBuffer: Buffer, srcId: string): Promise<void> {
    const requestKey = this.getRequestKey(packetBuffer.readUint16BE(2), srcId)
    const request = this.openContentRequest.get(requestKey)
    if (!request) {
      this.logger(`No open request for ${srcId} with connectionId ${packetBuffer.readUint16BE(2)}`)
      return
    }
    await request.handleUtpPacket(packetBuffer)
  }

  async send(enr: ENR | INodeAddress, msg: Buffer, networkId: NetworkId) {
    try {
      await this.client.sendPortalNetworkMessage(enr, msg, networkId, true)
    } catch {
      try {
        this.closeRequest(msg.readUInt16BE(2), enr.nodeId)
      } catch {
        //
      }
    }
  }
}

export * from './ContentRequest.js'
export * from './types.js'
