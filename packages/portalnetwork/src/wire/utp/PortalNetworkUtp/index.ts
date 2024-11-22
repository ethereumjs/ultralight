import {
  RequestCode,
  UtpSocketType,
  createContentRequest,
  createSocketKey,
  startingNrs,
} from '../../../index.js'
import { createUtpSocket } from '../Socket/index.js'

import type { Debugger } from 'debug'
import type {
  ContentRequestType,
  INewRequest,
  NetworkId,
  PortalNetwork,
  UtpSocketKey,
} from '../../../index.js'
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

  closeRequest(connectionId: number, peerId: string) {
    const requestKey = this.getRequestKey(connectionId, peerId)
    const request = this.openContentRequest.get(requestKey)
    if (request) {
      void request.socket.sendResetPacket()
      this.logger.extend('CLOSING')(`Closing uTP request with ${peerId}`)
      request.close()
      this.openContentRequest.delete(requestKey)
    }
  }

  getRequestKey(connId: number, peerId: string): string {
    const idA = connId + 1
    const idB = connId - 1
    const keyA = createSocketKey(peerId, connId)
    const keyB = createSocketKey(peerId, idA)
    const keyC = createSocketKey(peerId, idB)
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
    remoteAddress: string,
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
      remoteAddress,
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
    const { contentKeys, peerId, connectionId, requestCode } = params
    const content = params.contents ?? new Uint8Array()
    const sndId = this.startingIdNrs(connectionId)[requestCode].sndId
    const rcvId = this.startingIdNrs(connectionId)[requestCode].rcvId
    const socketKey = createSocketKey(peerId, connectionId)
    const socket = this.createPortalNetworkUTPSocket(
      params.networkId,
      requestCode,
      peerId,
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

  async send(peerId: string, msg: Buffer, networkId: NetworkId) {
    const enr = this.client.networks.get(networkId)?.routingTable.getWithPending(peerId)?.value
    try {
      await this.client.sendPortalNetworkMessage(enr ?? peerId, msg, networkId, true)
    } catch {
      this.closeRequest(msg.readUInt16BE(2), peerId)
    }
  }
}

export * from './ContentRequest.js'
export * from './types.js'
