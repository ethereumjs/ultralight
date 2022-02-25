import { _UTPSocket } from '../Socket/_UTPSocket'
import { Packet, PacketType } from '..'
import { debug, Debugger } from 'debug'
import { PortalNetwork, SubNetworkIds } from '../../..'
import { Discv5 } from '@chainsafe/discv5'
import { fromHexString } from '@chainsafe/ssz'
import { getContentIdFromSerializedKey } from '../../../historySubnetwork'

export class UtpProtocol {
  portal: PortalNetwork
  sockets: Record<string, _UTPSocket>
  client: Discv5
  contents: Record<string, Uint8Array>
  log: Debugger

  constructor(portal: PortalNetwork) {
    this.portal = portal
    this.client = portal.client
    this.sockets = {}
    this.contents = {}
    this.log = debug(this.client.enr.nodeId.slice(0, 5)).extend('<uTP>')
  }
  /**
   * Reads PacketType from Header and sends to hanlder
   * @param packet
   * @param srcId
   * @param msgId
   */

  async handleUtpPacket(packet: Packet, srcId: string, msgId: bigint): Promise<void> {
    switch (packet.header.pType) {
      case PacketType.ST_SYN:
        await this.handleSynPacket(packet, srcId, msgId)
        break
      case PacketType.ST_DATA:
        await this.handleDataPacket(packet, srcId, msgId)
        break
      case PacketType.ST_STATE:
        await this.handleStatePacket(packet, srcId, msgId)
        break
      case PacketType.ST_RESET:
        await this.handleResetPacket(packet, srcId, msgId)
        break
      case PacketType.ST_FIN:
        if (this.sockets[srcId + packet.header.connectionId]?.writing) {
          this.log(`received unexpected FIN packet while sending data to ${srcId}`)
          break
        } else {
          await this.handleFinPacket(packet, srcId, msgId)
        }
        break
    }
  }

  /**
   * Creates Write Socket with content from OFFER/ACCEPT
   * @param remoteAddr
   * @param connectionId
   * @param contentKeys payload from ACCEPT message
   */

  async initiateUtpFromAccept(
    remoteAddr: string,
    connectionId: number,
    contentKeys: Uint8Array[],
    networkId: SubNetworkIds
  ) {
    const socket = new _UTPSocket(this, remoteAddr, 'writing', networkId)
    const value = await this.portal.db.get(getContentIdFromSerializedKey(contentKeys[0]))
    socket.content = fromHexString(value)
    this.sockets[remoteAddr + connectionId] = socket
    await this.sockets[remoteAddr + connectionId].sendSynPacket(connectionId)
  }

  async initiateUtpTest(remoteAddr: string, connectionId: number, networkId: SubNetworkIds) {
    this.log(`Requesting uTP stream connection with ${remoteAddr}...`)
    const socket = new _UTPSocket(this, remoteAddr, 'writing', networkId)
    this.sockets[remoteAddr + connectionId] = socket
    await this.sockets[remoteAddr + connectionId].sendSynPacket(connectionId)
  }

  async awaitConnectionRequest(
    remoteAddr: string,
    connectionId: number,
    networkId: SubNetworkIds
  ): Promise<number> {
    this.log(`sending id: ${connectionId} Awaiting uTP stream request from ${remoteAddr}...`)
    const socket = new _UTPSocket(this, remoteAddr, 'reading', networkId)
    this.sockets[remoteAddr + connectionId] = socket
    return this.sockets[remoteAddr + connectionId].sndConnectionId
  }

  async initiateConnectionRequest(
    remoteAddr: string,
    connectionId: number,
    networkId: SubNetworkIds
  ): Promise<void> {
    this.log(`Requesting uTP stream connection with ${remoteAddr}...`)
    const socket = new _UTPSocket(this, remoteAddr, 'reading', networkId)
    this.sockets[remoteAddr + connectionId] = socket
    await this.sockets[remoteAddr + connectionId].sendSynPacket(connectionId)
  }

  async handleSynPacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<void> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    if (this.sockets[socketKey]) {
      await this.sockets[socketKey].handleIncomingConnectionRequest(packet)
    } else {
      // TODO: Figure out how to set network ID when receiving SYN packet with no socket (or
      // should we even create a socket if we weren't already expecting it?)
      const socket = new _UTPSocket(this, remoteAddr, 'writing', SubNetworkIds.HistoryNetwork)
      this.sockets[socketKey] = socket
      this.sockets[socketKey].content = this.contents[socketKey]
      await this.sockets[socketKey].handleIncomingConnectionRequest(packet)
    }
    this.sockets[socketKey].logger('SYN Packet Received')
  }

  async handleStatePacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<void> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    try {
      this.sockets[socketKey].handleStatePacket(packet)
      this.sockets[socketKey].logger(
        `STATE Packet received.  SeqNr: ${packet.header.seqNr} AckNr: ${packet.header.ackNr}`
      )
    } catch (err: any) {
      this.log(`Error parsing ST_STATE packet.  ${err.message}`)
    }
  }

  async handleFinPacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<Uint8Array> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    this.sockets[socketKey].logger(
      `FIN Packet received.  SeqNr: ${packet.header.seqNr} AckNr: ${packet.header.ackNr}`
    )
    await this.sockets[socketKey].handleFinPacket(packet)
    this.contents[socketKey] = this.sockets[socketKey].content
    const compiledData = this.contents[socketKey]
    delete this.sockets[socketKey]
    delete this.contents[socketKey]
    return compiledData
  }

  async handleDataPacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<void> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    await this.sockets[socketKey].handleDataPacket(packet)
    this.sockets[socketKey].logger(
      `DATA Packet received.  SeqNr: ${packet.header.seqNr} AckNr: ${packet.header.ackNr}`
    )
  }

  async handleResetPacket(packet: Packet, remoteAddr: string, _msgId: bigint) {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    this.sockets.socketKey.logger('RESET Packet Received.')
    delete this.sockets[socketKey]
    delete this.contents[socketKey]
    this.log('Socket from registry.')
  }

  getSocketKey = (remoteAddr: string, connectionId: number) => {
    if (this.sockets[remoteAddr + connectionId]) {
      return remoteAddr + connectionId
    } else if (this.sockets[remoteAddr + (connectionId - 1)]) {
      return remoteAddr + (connectionId - 1)
    }
    return ''
  }
}
