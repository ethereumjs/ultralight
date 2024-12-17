import {
  RequestCode,
  UtpSocketType,
  createContentRequest,
  createSocketKey,
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
 UtpSocketKey } from '../../../index.js'
import type { SocketType } from '../Socket/index.js'

export class PortalNetworkUTP {
  client: PortalNetwork
  openContentRequest: Map<UtpSocketKey, ContentRequestType>
  logger: Debugger
  working: boolean

  constructor(client: PortalNetwork) {
    this.client = client
    this.logger = client.logger.extend(`uTP`)
    this.openContentRequest = new Map()
    this.working = false
  }

  closeRequest(connectionId: number, nodeId: string) {
    const requestKey = this.getRequestKey(connectionId, nodeId)
    const request = this.openContentRequest.get(requestKey)
    if (request) {
      void request.socket.sendResetPacket()
      this.logger.extend('CLOSING')(`Closing uTP request with ${nodeId}`)
      request.close()
      this.openContentRequest.delete(requestKey)
    }
  }

  getRequestKey(connId: number, nodeId: string): string {
    const idA = connId + 1
    const idB = connId - 1
    const keyA = createSocketKey(nodeId, connId)
    const keyB = createSocketKey(nodeId, idA)
    const keyC = createSocketKey(nodeId, idB)
    for (const key of [keyA, keyB, keyC]) {
      if (this.openContentRequest.get(key) !== undefined) {
        return key
      }
    }
    throw new Error(`Cannot Find Open Request for socketKey ${keyA} or ${keyB} or ${keyC}`)
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
      this.closeRequest(msg.readUInt16BE(2), enr.nodeId)
    }
  }
}

export * from './ContentRequest.js'
export * from './types.js'
