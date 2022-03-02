import { _UTPSocket } from '../Socket/_UTPSocket'
import { ConnectionState, Packet, PacketType } from '..'
import { debug, Debugger } from 'debug'
import { PortalNetwork, SubNetworkIds } from '../../..'
import { Discv5 } from '@chainsafe/discv5'
import { fromHexString } from '@chainsafe/ssz'
import { serializedContentKeyToContentId } from '../../../util'
import { HistoryNetworkContentTypes } from '../../../historySubnetwork/types'
import { check } from 'prettier'

const testArray = fromHexString(
  '0xf90434f90215a00c1cf9b3d4aa3e20e12b355416a4e3202da53f54eaaafc882a7644e3e68127eca0f4174c5237efe5dfcb1f91cee73ef3e15f896775f5374f8628f6660cd0b991dc94790b8a3ce86e707ed0ed32bf89b3269692a23cc1a03b98c5006b88099ed6ca063af4d9bea89698d5d801a58a35b2aed98165ee5fb8a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25d1fc5083030d43832fefd8808455ee02ad98d783010102844765746887676f312e342e32856c696e7578a0497b768e3d6e1e71063731cbd6efeb0ba6f4f8a1325f8bc89994168b873ddc27887b14e3ad9b3bd930c0f90218f90215a013ced9eaa49a522d4e7dcf80a739a57dbf08f4ce5efc4edbac86a66d8010f693a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347941dcb8d1f0fcc8cbc8c2d76528e877f915e299fbea0afe287aafc9e00aa3f0179c2eb41b9bae0aabe571fc9b1b46bb3da1036b25e01a0cf08f8f9c3416d71d76e914799ba9ac59bd2b36d64e412fee101ad438281b170a0acf0270ca48a90509ee1c00b8bd893a2653b6b7a099433104305fba81ea903cfb90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25e8b8e583030d41832fefd882a4108455ee029796d583010102844765746885676f312e35856c696e7578a0ed167976e19753250f87c908873675e548a0c204a13b35c7ef9214582261e9f488d74671daa008f803'
)

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

  async initiateUtpTest(remoteAddr: string, connectionId: number, networkId: SubNetworkIds) {
    this.log(`Requesting uTP stream connection with ${remoteAddr}...`)
    const socket = new _UTPSocket(this, remoteAddr, 'writing', networkId, 0)
    socket.content = testArray
    this.sockets[remoteAddr + connectionId] = socket
    await this.sockets[remoteAddr + connectionId].sendSynPacket(connectionId)
  }

  /**
   * Creates Write Sockets for each piece of content from OFFER/ACCEPT
   * @param remoteAddr
   * @param connectionId uTP ID set by accepting node
   * @param contentKeys payload from ACCEPT message
   * @param contentTypes array of content types accepted
   * @param networkId
   */

  async handleAccept(
    remoteAddr: string,
    connectionId: number,
    contentKeys: Uint8Array[],
    contentTypes: number[],
    networkId: SubNetworkIds
  ) {
    const socketKey = this.getSocketKey(remoteAddr, connectionId)
    contentKeys.forEach(async (content, idx) => {
      while (!this.sockets[socketKey]) {
        const socket = new _UTPSocket(this, remoteAddr, 'writing', networkId, contentTypes[idx])
        const value = await this.portal.db.get(serializedContentKeyToContentId(contentKeys[idx]))
        this.contents[socketKey] = content
        socket.content = fromHexString(value)
        this.sockets[socketKey] = socket
        await this.sockets[socketKey].sendSynPacket(connectionId)
      }
    })
  }

  /**
   * Creates Read Sockets for each piece of content from OFFER/ACCEPT
   * @param remoteAddr
   * @param connectionId uTP ID set by accepting node
   * @param contentKeys payload from ACCEPT message
   * @param contentTypes array of content types accepted
   * @param networkId
   */

  async acceptOffer(
    remoteAddr: string,
    connectionId: number,
    contentTypes: number[],
    subNetworkId: SubNetworkIds
  ): Promise<void> {
    this.log(`sending id: ${connectionId} Awaiting uTP stream request from ${remoteAddr}...`)
    const socketKey = this.getSocketKey(remoteAddr, connectionId)
    contentTypes.forEach((type, idx) => {
      while (!this.sockets[socketKey]) {
        const socket = new _UTPSocket(this, remoteAddr, 'reading', subNetworkId, type)
        this.sockets[socketKey] = socket
      }
    })
  }

  /**
   * Creates Read Socket to receive FOUNDCONTENT
   * @param remoteAddr
   * @param connectionId
   * @param contentType
   * @param networkId
   */

  async handleFoundContent(
    remoteAddr: string,
    connectionId: number,
    networkId: SubNetworkIds,
    contentType: HistoryNetworkContentTypes
  ): Promise<void> {
    const socket = new _UTPSocket(this, remoteAddr, 'reading', networkId, contentType)
    const socketKey = this.getSocketKey(remoteAddr, connectionId)
    this.log(`Opening "Socket: ${socketKey.slice(0, 5)}..." to receive FOUNDCONTENT stream.`)
    this.sockets[socketKey] = socket
    await this.sockets[socketKey].sendSynPacket(connectionId)
  }

  /**
   * Creates Write Socket to send FOUNDCONTENT
   * @param remoteAddr
   * @param connectionId
   * @param content from database
   * @param contentType
   * @param networkId
   */

  async sendFoundContent(
    remoteAddr: string,
    connectionId: number,
    content: Uint8Array,
    contentType: HistoryNetworkContentTypes,
    networkId: SubNetworkIds
  ): Promise<void> {
    const socketKey = this.getSocketKey(remoteAddr, connectionId)
    const socket = new _UTPSocket(this, remoteAddr, 'writing', networkId, contentType)
    this.sockets[socketKey] = socket
    this.contents[socketKey] = content
    this.sockets[socketKey].content = content
  }

  async handleSynPacket(packet: Packet, remoteAddr: string, _msgId: bigint): Promise<void> {
    const socketKey = this.getSocketKey(remoteAddr, packet.header.connectionId)
    if (this.sockets[socketKey]) {
      await this.sockets[socketKey].handleSynPacket(packet)
      this.sockets[socketKey].logger('SYN Packet Received')
    } else {
      this.log(`Why did I get a SYN packet from ${remoteAddr}??`)
    }
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
