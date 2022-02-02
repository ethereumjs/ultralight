import { _UTPSocket } from '../Socket/_UTPSocket'
import { Packet, PacketType } from '..'
import { debug } from 'debug'
import { PortalNetwork } from '../../..'
import { Discv5 } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { getContentIdFromSerializedKey } from '../../../historySubnetwork'

const log = debug('<uTP>')

export class UtpProtocol {
  portal: PortalNetwork
  sockets: Record<string, _UTPSocket>
  client: Discv5
  contents: Record<string, Uint8Array>

  constructor(portal: PortalNetwork) {
    this.portal = portal
    this.client = portal.client
    this.sockets = {}
    this.contents = {}
  }

  async handleUtpPacket(packet: Packet, srcId: string, msgId: bigint): Promise<void> {
    // Client receives CONTENT talkreq message with uTP Network ID
    // Talkreq handler decodes CONTENT message, sends decoded message here
    // This reads the PacketType from the Packet Header, and sends each to different handler.
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
        await this.handleResetPacket
        break
      case PacketType.ST_FIN:
        if (this.sockets[srcId + packet.header.connectionId]?.writing) {
          log(`received unexpected FIN packet while sending data to ${srcId}`)
          break
        } else {
          const content = await this.handleFinPacket(packet, srcId, msgId)
          log(`content received over uTP ${toHexString(content)}`)
        }
        break
    }
  }

  async initiateUtpFromAccept(remoteAddr: string, connectionId: number, contentKeys: Uint8Array[]) {
    // Client received connectionId in an ACCEPT talkresp from a node at:  remoteAddr
    log(`Requesting uTP stream connection with ${remoteAddr}...`)
    log(`Opening uTP socket to send DATA to ${remoteAddr}`)
    // Creates a new uTP socket for remoteAddr
    const socket = new _UTPSocket(this, remoteAddr, 'writing')
    // Retrieve content corresponding to first contentKey
    const value = await this.portal.db.get(getContentIdFromSerializedKey(contentKeys[0]))
    // Loads database content to socket
    socket.content = fromHexString(value)
    // Adds this socket to 'sockets' registry, wtih remoteAddr as key
    this.sockets[remoteAddr + connectionId] = socket

    // Sends Syn Packet to begin uTP connection process using connectionId
    await this.sockets[remoteAddr + connectionId].sendSynPacket(connectionId)
  }

  async initiateUtpTest(remoteAddr: string, connectionId: number) {
    // Client received connectionId in an ACCEPT talkresp from a node at:  remoteAddr
    log(`Requesting uTP stream connection with ${remoteAddr}...`)
    log(`Opening uTP socket to send DATA to ${remoteAddr}`)
    // Creates a new uTP socket for remoteAddr
    const socket = new _UTPSocket(this, remoteAddr, 'writing')
    /*const value = new Uint8Array(2000)
    value.fill(1)
    // Loads database content to socket
    socket.content = value*/
    // Adds this socket to 'sockets' registry, wtih remoteAddr as key
    this.sockets[remoteAddr + connectionId] = socket

    // Sends Syn Packet to begin uTP connection process using connectionId
    await this.sockets[remoteAddr + connectionId].sendSynPacket(connectionId)
  }

  async awaitConnectionRequest(remoteAddr: string, connectionId: number): Promise<number> {
    // Client received connectionId in a talkreq or talkresp from a node at:  remoteAddr
    log(`sending id: ${connectionId} Awaiting uTP stream request from ${remoteAddr}...`)
    // Creates a new uTP socket for remoteAddr
    const socket = new _UTPSocket(this, remoteAddr, 'reading')
    // Adds this socket to 'sockets' registry, wtih remoteAddr as key
    this.sockets[remoteAddr + connectionId] = socket
    // Sends Syn Packet to begin uTP connection process using connectionId
    return this.sockets[remoteAddr + connectionId].sndConnectionId
  }

  async initiateConnectionRequest(remoteAddr: string, connectionId: number): Promise<void> {
    // Client received connectionId in a talkreq or talkresp from a node at:  remoteAddr
    log(`Requesting uTP stream connection with ${remoteAddr}...`)
    // Creates a new uTP socket for remoteAddr
    const socket = new _UTPSocket(this, remoteAddr, 'reading')
    // Adds this socket to 'sockets' registry, wtih remoteAddr as key
    this.sockets[remoteAddr + connectionId] = socket
    // Sends Syn Packet to begin uTP connection process using connectionId
    await this.sockets[remoteAddr + connectionId].sendSynPacket(connectionId)
  }

  async handleSynPacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<void> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    if (this.sockets[socketKey]) {
      log(`Accepting uTP stream request...  Sending SYN ACK...  Listening for data...`)
      await this.sockets[socketKey].handleIncomingStreamRequest(packet)
    } else {
      log(`Received incoming ST_SYN packet...uTP connection requested by ${remoteAddr}`)
      // Creates a new socket for remoteAddr
      const socket = new _UTPSocket(this, remoteAddr, 'writing')
      // Adds this socket to 'sockets' registry wtih remoteAddr as key
      this.sockets[socketKey] = socket
      // Passes content from "Database" to the socket
      this.sockets[socketKey].content = this.contents[socketKey]
      // Socket processes the SYN packet
      // Accepts connection by sending a SYN ACK - which is a STATE packet
      log(
        `Accepting uTP stream request...  Sending SYN ACK...  Preparing to send ${this.contents}...`
      )
      await this.sockets[socketKey].handleIncomingConnectionRequest(packet)
    }
  }

  async handleStatePacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<void> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    // STATE packets, also known as ACK packets, are sent as response to SYN or DATA packets
    // And in some cases to STATE or FIN packets.
    log('Received ST_STATE packet from ' + remoteAddr)
    log('seqnr: ' + packet.header.seqNr + 'acknr:' + packet.header.ackNr)
    // Socket will decode and process packet
    try {
      this.sockets[socketKey].handleStatePacket(packet)
    } catch (err: any) {
      log(`Error parsing ST_STATE packet.  ${err.message}`)
    }
  }

  async handleFinPacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<Uint8Array> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)

    // FIN packet is sent when sending node has sent all DATA packets.
    log(
      'Received ST_FIN packet from ' +
        remoteAddr +
        '.  Socket will close when all packets have been processed.'
    )
    // Socket should remain open untill all DATA packets have been received.
    await this.sockets[socketKey].handleFinPacket(packet)
    // Socket will compile Packets, and reassemble the full payload.
    this.contents[socketKey] = this.sockets[socketKey].content
    // TODO -- Test reader with out of order packets/ lost packets
    log(
      `${this.contents[socketKey].length} bytes received. ${this.contents[socketKey]
        .toString()
        .slice(0, 20)} ...`
    )
    log(`${this.sockets[socketKey].readerContent.toString().slice(0, 20)}`)
    // Closes socket (deletes from registry)
    const compiledData = this.contents[socketKey]
    delete this.sockets[socketKey]
    delete this.contents[socketKey]
    return compiledData
  }

  async handleDataPacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<void> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    // Socket will read seqNr from Packet Header.
    // If packet arrived in expected order, will respond with ACK (STATE Packet)
    // If packet arrived out of order, will respond with SELECTIVE ACK (STATE Packet)
    // Socket will recalculate it's WINDOW_SIZE based on metadata in the Packet Header
    // Congestion Control (CC) uses WINDOW_SIZE to determine packet sizes
    // CC also will TIMEOUT the stream if packets appear lost (if the seqNr falls behind by more than 3)
    log(
      `received CONTENT seqNr: ${packet.header.seqNr} ackNr: ${packet.header.ackNr} Length: ${
        packet.payload.length
      } Bytes: ${packet.payload.slice(0, 10)}... `
    )
    await this.sockets[socketKey].handleDataPacket(packet)
  }

  async handleResetPacket(packet: Packet, remoteAddr: string, _msgId: bigint) {
    // Closes socket (deletes from registry)
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    delete this.sockets[socketKey]
    delete this.contents[socketKey]
    log('Got Reset Packet...Deleting socket from registry.')
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
