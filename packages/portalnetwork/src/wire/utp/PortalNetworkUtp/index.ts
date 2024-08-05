import { BitVectorType, toHexString } from '@chainsafe/ssz'

import {
  Bytes32TimeStamp,
  ConnectionState,
  ContentRequest,
  Packet,
  PacketType,
  RequestCode,
  UtpSocket,
  UtpSocketType,
  bitmap,
  createSocketKey,
  startingNrs,
} from '../../../index.js'

import type {
  DataPacket,
  FinPacket,
  INewRequest,
  NetworkId,
  PortalNetwork,
  SelectiveAckHeader,
  StatePacket,
  SynPacket,
  UtpSocketKey,
} from '../../../index.js'
import type { Debugger } from 'debug'

export class PortalNetworkUTP {
  client: PortalNetwork
  openContentRequest: Map<UtpSocketKey, ContentRequest>
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
  ): UtpSocket {
    const socket: UtpSocket = new UtpSocket({
      utp: this,
      networkId,
      remoteAddress,
      sndId,
      rcvId,
      seqNr: startingNrs[requestCode].seqNr,
      ackNr: startingNrs[requestCode].ackNr,
      type: requestCode % 2 === 0 ? UtpSocketType.WRITE : UtpSocketType.READ,
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

  async handleNewRequest(params: INewRequest): Promise<ContentRequest> {
    const { contentKeys, peerId, connectionId, requestCode } = params
    const content = params.contents ? params.contents[0] : undefined
    const sndId = this.startingIdNrs(connectionId)[requestCode].sndId
    const rcvId = this.startingIdNrs(connectionId)[requestCode].rcvId
    const newRequest = new ContentRequest({
      networkId: params.networkId,
      requestCode,
      socket: this.createPortalNetworkUTPSocket(
        params.networkId,
        requestCode,
        peerId,
        sndId,
        rcvId,
        content,
      ),
      socketKey: createSocketKey(peerId, connectionId),
      content: params.contents ? params.contents[0] : undefined,
      contentKeys,
    })
    this.openContentRequest.set(newRequest.socketKey, newRequest)
    this.logger(`Opening request with key: ${newRequest.socketKey}`)
    this.logger(`{ socket.sndId: ${sndId}, socket.rcvId: ${rcvId} }`)
    await newRequest.init()
    return newRequest
  }

  async handleUtpPacket(packetBuffer: Buffer, srcId: string): Promise<void> {
    const timeReceived = Bytes32TimeStamp()
    const requestKey = this.getRequestKey(packetBuffer.readUint16BE(2), srcId)
    const request = this.openContentRequest.get(requestKey)
    if (request) {
      request.socket._clearTimeout()
      const packet = Packet.fromBuffer(packetBuffer)
      request.socket.updateDelay(timeReceived, packet.header.timestampMicroseconds)
      this.logger.extend('RECEIVED').extend(PacketType[packet.header.pType])(
        `|| pktId: ${packet.header.connectionId}     ||`,
      )
      this.logger.extend('RECEIVED').extend(PacketType[packet.header.pType])(
        `|| seqNr: ${packet.header.seqNr}     ||`,
      )
      this.logger.extend('RECEIVED').extend(PacketType[packet.header.pType])(
        `|| ackNr: ${packet.header.ackNr}     ||`,
      )
      switch (packet.header.pType) {
        case PacketType.ST_SYN:
          requestKey && (await this._handleSynPacket(request, packet))
          break
        case PacketType.ST_DATA:
          requestKey && (await this._handleDataPacket(request, packet))
          break
        case PacketType.ST_STATE:
          if (packet.header.extension === 1) {
            await this._handleSelectiveAckPacket(request, packet)
          } else {
            await this._handleStatePacket(request, packet)
          }
          break
        case PacketType.ST_RESET:
          break
        case PacketType.ST_FIN:
          requestKey && (await this._handleFinPacket(request, packet))
          break
        default:
          throw new Error(`Unknown Packet Type ${packet.header.pType}`)
      }
    }
  }

  async send(peerId: string, msg: Buffer, networkId: NetworkId) {
    const enr = this.client.networks.get(networkId)?.routingTable.getWithPending(peerId)?.value
    try {
      await this.client.sendPortalNetworkMessage(enr ?? peerId, msg, networkId, true)
    } catch {
      this.closeRequest(msg.readUInt16BE(2), peerId)
    }
  }

  async _handleSynPacket(request: ContentRequest, packet: SynPacket): Promise<void> {
    this.logger(`SYN received to initiate stream for ${RequestCode[request.requestCode]} request`)
    switch (request.requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
      case RequestCode.ACCEPT_READ:
        await request.socket.handleSynPacket(packet.header.seqNr)
        break
      default:
        throw new Error('I send SYNs, I do not handle them.')
    }
  }
  async _handleStatePacket(request: ContentRequest, packet: StatePacket): Promise<void> {
    switch (request.requestCode) {
      case RequestCode.FINDCONTENT_READ: {
        if (request.socket.state === ConnectionState.SynSent) {
          request.socket.setAckNr(packet.header.seqNr)
          request.socket.setReader(packet.header.seqNr)
          request.socket.reader!.bytesExpected = Infinity
          return
        } else {
          throw new Error('READ socket should not get acks')
        }
      }
      case RequestCode.FOUNDCONTENT_WRITE:
        break
      case RequestCode.OFFER_WRITE:
        request.socket.logger(`(${request.socket.state})socket.seqNr: ${request.socket.getSeqNr()}`)
        if (packet.header.seqNr === request.socket.finNr) {
          break
        }
        if (request.socket.state === ConnectionState.SynSent) {
          request.socket.setAckNr(packet.header.seqNr - 1)
          request.socket.setSeqNr(packet.header.ackNr + 1)
          request.socket.logger(
            `SYN-ACK received for OFFERACCEPT request with connectionId: ${packet.header.connectionId}.  Beginning DATA stream.`,
          )
          request.socket.setWriter(request.socket.getSeqNr())
        }
        break
      case RequestCode.ACCEPT_READ:
      default:
        throw new Error('Why did I get a STATE packet?')
    }
    await request.socket.handleStatePacket(packet.header.ackNr, packet.header.timestampMicroseconds)
  }
  public static bitmaskToAckNrs(bitmask: Uint8Array, ackNr: number): number[] {
    const bitArray = new BitVectorType(32).deserialize(bitmask)
    const ackNrs = bitArray.getTrueBitIndexes().map((index) => {
      return bitmap[index] + ackNr
    })
    return ackNrs
  }
  async _handleSelectiveAckPacket(request: ContentRequest, packet: StatePacket): Promise<void> {
    const ackNrs = PortalNetworkUTP.bitmaskToAckNrs(
      (packet.header as SelectiveAckHeader).selectiveAckExtension.bitmask,
      request.socket.ackNr,
    )
    const acked = ackNrs.find((a) => !request.socket.ackNrs.includes(a))
    request.socket.logger(
      `ST_STATE (SELECTIVE_ACK) received with ackNr: ${
        packet.header.ackNr
      }, and a bitmask referencing ackNrs: ${ackNrs}.  Packet acks DATA packet seqNr: ${acked}.  Receive socket still waits for seqNr: ${
        packet.header.ackNr + 1
      }`,
    )
    if (acked !== undefined) {
      request.socket.updateRTT(packet.header.timestampMicroseconds, acked)
      request.socket.ackNrs.push(acked)
    }
    switch (request.requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
      case RequestCode.OFFER_WRITE:
        if (ackNrs.length >= 3) {
          // If packet is more than 3 behind, assume it to be lost and resend.
          request.socket.writer!.seqNr = packet.header.ackNr + 1
        }
        await request.socket.handleStatePacket(
          packet.header.ackNr,
          packet.header.timestampMicroseconds,
        )
        return
      default:
        throw new Error('Why did I get a SELECTIVE ACK packet?')
    }
  }
  async _handleDataPacket(request: ContentRequest, packet: DataPacket) {
    switch (request.requestCode) {
      case RequestCode.FINDCONTENT_READ:
      case RequestCode.ACCEPT_READ:
        await request.socket.handleDataPacket(packet)
        while (request.socket.reader!.contents.length > 0) {
          const key = request.contentKeys.shift()!
          const value = request.socket.reader!.contents.shift()!
          this.logger(
            `Storing: ${toHexString(key)}.  ${request.contentKeys.length} still streaming.`,
          )
          await this.returnContent(request.networkId, [value], [key])
          if (request.contentKeys.length === 0) {
            request.socket.close()
            request.close()
            this.openContentRequest.delete(request.socketKey)
          }
          if (request.socket.state === ConnectionState.GotFin) {
            for (let i = request.socket.reader!.startingDataNr; i < request.socket.finNr!; i++) {
              if (request.socket.reader!.packets[i] === undefined) {
                return
              }
              await this.returnContent(
                request.networkId,
                [Uint8Array.from(request.socket.reader!.bytes)],
                request.contentKeys,
              )
              request.socket.close()
              request.close()
              this.openContentRequest.delete(request.socketKey)
            }
          }
        }
        return
      default:
        throw new Error(`Why did I get a DATA packet?`)
    }
  }
  async _handleResetPacket(request: ContentRequest) {
    request.socket.close()
  }
  async _handleFinPacket(request: ContentRequest, packet: FinPacket) {
    if (request.socket.type === UtpSocketType.WRITE) {
      request.close()
      this.openContentRequest.delete(request.socketKey)
    }
    if (request.requestCode === RequestCode.FINDCONTENT_READ) {
      const content = await request.socket.handleFinPacket(packet, true)
      if (!content) return
      await this.returnContent(request.networkId, [content], request.contentKeys)
      request.socket.close()
      request.close()
      this.openContentRequest.delete(request.socketKey)
    } else {
      await request.socket.handleFinPacket(packet)
    }
  }
  async returnContent(networkId: NetworkId, contents: Uint8Array[], keys: Uint8Array[]) {
    this.logger(`Decompressing stream into ${keys.length} pieces of content`)
    const network = this.client.networks.get(networkId)!
    for (const [idx, k] of keys.entries()) {
      const _content = contents[idx]
      this.logger.extend(`FINISHED`)(
        `${idx + 1}/${keys.length} -- (${_content.length} bytes) sending content type: ${k[0]} to database`,
      )
      await network.store(toHexString(k), _content)
    }
  }
}

export * from './ContentRequest.js'
export * from './types.js'
