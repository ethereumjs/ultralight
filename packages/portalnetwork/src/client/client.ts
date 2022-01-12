import {
  Discv5,
  ENR,
  EntryStatus,
  IDiscv5CreateOptions,
  log2Distance,
  NodeId,
} from '@chainsafe/discv5'
import { ITalkReqMessage, ITalkRespMessage } from '@chainsafe/discv5/lib/message'
import { EventEmitter } from 'events'
import debug from 'debug'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { StateNetworkRoutingTable } from '..'
import { generateRandomNodeIdAtDistance, shortId } from '../util'
import { bufferToPacket, randUint16, UtpProtocol } from '../wire/utp'
import {
  PingPongCustomDataType,
  MessageCodes,
  SubNetworkIds,
  FindNodesMessage,
  NodesMessage,
  PortalWireMessageType,
  FindContentMessage,
  ContentMessageType,
  OfferMessage,
  AcceptMessage,
  PongMessage,
  PingMessage,
} from '../wire'
import { PortalNetworkEventEmitter } from './types'
import { PortalNetworkRoutingTable } from '.'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { LevelUp } from 'levelup'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo'
import {
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
} from '../historySubnetwork/types'
import { Block, BlockHeader } from '@ethereumjs/block'
import { getContentId, getContentIdFromSerializedKey } from '../historySubnetwork'
const level = require('level-mem')

const _log = debug('portalnetwork')

const MAX_PACKET_SIZE = 1280

export class PortalNetwork extends (EventEmitter as { new (): PortalNetworkEventEmitter }) {
  client: Discv5
  stateNetworkRoutingTable: StateNetworkRoutingTable
  historyNetworkRoutingTable: PortalNetworkRoutingTable
  uTP: UtpProtocol
  nodeRadius: number
  db: LevelUp
  private refreshListener: ReturnType<typeof setInterval>

  /**
   *
   * @param ip initial local IP address of node
   * @param proxyAddress IP address of proxy
   * @returns a new PortalNetwork instance
   */
  public static createPortalNetwork = async (ip: string, proxyAddress = '127.0.0.1') => {
    const id = await PeerId.create({ keyType: 'secp256k1' })
    const enr = ENR.createFromPeerId(id)
    enr.setLocationMultiaddr(new Multiaddr(`/ip4/${ip}/udp/0`))
    return new PortalNetwork(
      {
        enr,
        peerId: id,
        multiaddr: enr.getLocationMultiaddr('udp')!,
        transport: 'wss',
        proxyAddress: proxyAddress,
      },
      1
    )
  }

  /**
   *
   * Portal Network constructor
   * @param config a dictionary of `IDiscv5CreateOptions` for configuring the discv5 networking layer
   * @param radius defines the radius of data the node is interesting in storing
   * @param db a `level` compliant database provided by the module consumer - instantiates an in-memory DB if not provided
   */
  constructor(config: IDiscv5CreateOptions, radius = 1, db?: LevelUp) {
    // eslint-disable-next-line constructor-super
    super()
    this.client = Discv5.create(config)
    this.on('Stream', (id, content) => {
      this.handleStreamedContent(id, content)
    })
    this.nodeRadius = radius
    this.stateNetworkRoutingTable = new StateNetworkRoutingTable(this.client.enr.nodeId)
    this.historyNetworkRoutingTable = new PortalNetworkRoutingTable(this.client.enr.nodeId)
    this.client.on('talkReqReceived', this.onTalkReq)
    this.client.on('talkRespReceived', this.onTalkResp)
    this.client.on('sessionEnded', (srcId) => {
      // Remove node from subnetwork routing tables when a session is ended by discv5
      // (i.e. failed a liveness check)
      this.updateSubnetworkRoutingTable(srcId, SubNetworkIds.StateNetwork)
      this.updateSubnetworkRoutingTable(srcId, SubNetworkIds.HistoryNetwork)
    })
    this.uTP = new UtpProtocol(this)
    this.db = db ?? level()
    ;(this.client as any).sessionService.on('established', (enr: ENR) => {
      this.sendPing(enr.nodeId, SubNetworkIds.HistoryNetwork)
    })
    // Start kbucket refresh on 30 second interval
    this.refreshListener = setInterval(() => this.bucketRefresh(), 30000)
  }

  log = (msg: any) => {
    _log(msg)
    typeof msg === 'string'
      ? this.emit('log', msg)
      : this.emit(
          'log',
          `Payload: SSZ Union<${Object.entries(msg)
            .map(([k, v]) => {
              return `${k}: ${v}`
            })
            .toString()}>`
        )
  }

  /**
   * Starts the portal network client
   */
  public start = async () => {
    // Hardcoded data for testing - block 1 from mainnet
    const block1HeaderRlp =
      '0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4'
    const block1Hash = '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
    this.addContentToHistory(1, HistoryNetworkContentTypes.BlockHeader, block1Hash, block1HeaderRlp)
    await this.client.start()
  }

  /**
   * Stops the portal network client and cleans up listeners
   */
  public stop = async () => {
    await this.client.stop()
    clearInterval(this.refreshListener)
  }
  /**
   *
   * @param namespaces comma separated list of logging namespaces
   * defaults to "portalnetwork*, discv5:service, <uTP>*,<uTP>:Reader*"
   */
  public enableLog = (
    namespaces: string = 'portalnetwork*,discv5:service*,<uTP>*,<uTP>:Reader*'
  ) => {
    debug.enable(namespaces)
  }

  /**
   * @returns the node's current radius
   */
  public get radius() {
    return this.nodeRadius
  }

  /**
   * Updates the node's radius for interested content
   * @param value number representing the new radius
   * @throws if `value` is outside correct range
   */
  public set radius(value: number) {
    if (value > 256 || value < 0) {
      throw new Error('radius must be between 0 and 256')
    }
    this.nodeRadius = value
  }

  /**
   * Sends a Portal Network Wire Protocol PING message to a specified node
   * @param dstId the nodeId of the peer to send a ping to
   * @param payload custom payload to be sent in PING message
   * @param networkId subnetwork ID
   * @returns the PING payload specified by the subnetwork or undefined
   */
  public sendPing = async (dstId: string, networkId: SubNetworkIds) => {
    const payload = PingPongCustomDataType.serialize({ radius: BigInt(this.nodeRadius) })
    const pingMsg = PortalWireMessageType.serialize({
      selector: MessageCodes.PING,
      value: {
        enrSeq: this.client.enr.seq,
        customPayload: payload,
      },
    })
    try {
      this.log(`Sending PING to ${shortId(dstId)} for ${SubNetworkIds.StateNetwork} subnetwork`)
      const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(pingMsg), networkId)
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.PONG) {
        this.log(`Received PONG from ${shortId(dstId)}`)
        const decoded = PortalWireMessageType.deserialize(res)
        const pongMessage = decoded.value as PongMessage
        this.updateSubnetworkRoutingTable(dstId, networkId, pongMessage.customPayload)
        return decoded.value as PongMessage
      }
    } catch (err: any) {
      this.log(`Error during PING request to ${shortId(dstId)}: ${err.toString()}`)
      this.updateSubnetworkRoutingTable(dstId, networkId)
    }
  }

  /**
   *
   * Sends a Portal Network FINDNODES request to a peer requesting other node ENRs
   * @param dstId node id of peer
   * @param distances distances as defined by subnetwork for node ENRs being requested
   * @param networkId subnetwork id for message being
   * @returns a {@link `NodesMessage`} or undefined
   */
  public sendFindNodes = async (
    dstId: string,
    distances: Uint16Array,
    networkId: SubNetworkIds
  ) => {
    const findNodesMsg: FindNodesMessage = { distances: distances }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDNODES,
      value: findNodesMsg,
    })
    try {
      this.log(
        `Sending FINDNODES to ${shortId(dstId)} for ${SubNetworkIds.StateNetwork} subnetwork`
      )
      const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.NODES) {
        this.log(`Received NODES from ${shortId(dstId)}`)
        const decoded = PortalWireMessageType.deserialize(res).value as NodesMessage
        if (decoded) {
          this.log(`Received ${decoded.total} ENRs from ${shortId(dstId)}`)
          decoded.enrs.forEach((enr) => {
            const decodedEnr = ENR.decode(Buffer.from(enr))
            this.log(decodedEnr.nodeId)
            // Add ENR to Discv5 routing table since we can't send messages to a node that's not in the discv5 table
            // (see discv5.service.sendRequest message)
            // TODO: Fix discv5.service.sendRequest to accept either a `NodeId` or an `ENR`
            this.client.addEnr(decodedEnr)
            switch (networkId) {
              case SubNetworkIds.StateNetwork:
                if (!this.stateNetworkRoutingTable.getValue(decodedEnr.nodeId)) {
                  // Add node to State Subnetwork Routing Table if we don't already know it
                  this.stateNetworkRoutingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
                  this.sendPing(decodedEnr.nodeId, networkId)
                }
                break
              case SubNetworkIds.HistoryNetwork:
                if (!this.historyNetworkRoutingTable.getValue(decodedEnr.nodeId)) {
                  // Add node to History Subnetwork Routing Table if we don't already know it
                  this.historyNetworkRoutingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
                  this.sendPing(decodedEnr.nodeId, networkId)
                }
                break
            }
          })
        }
        return decoded
      }
    } catch (err: any) {
      this.log(`Error sending FINDNODES to ${shortId(dstId)} - ${err}`)
    }
  }

  /**
   * Starts recursive lookup for content corresponding to `key`
   * @param dstId node id of peer
   * @param key content key defined by the subnetwork spec
   * @param networkId subnetwork ID on which content is being sought
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (dstId: string, key: Uint8Array, networkId: SubNetworkIds) => {
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    this.log(
      `Sending FINDCONTENT to ${shortId(dstId)} for ${SubNetworkIds.StateNetwork} subnetwork`
    )
    const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
    try {
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.CONTENT) {
        this.log(`Received FOUNDCONTENT from ${shortId(dstId)}`)
        // TODO: Switch this to use PortalWireMessageType.deserialize if type inference can be worked out
        const decoded = ContentMessageType.deserialize(res.slice(1))
        switch (decoded.selector) {
          case 0: {
            const id = Buffer.from(decoded.value as Uint8Array).readUInt16BE(0)
            this.log(`received Connection ID ${id}`)
            this.sendUtpStreamRequest(dstId, id)
            break
          }
          case 1: {
            this.log(`received content ${Buffer.from(decoded.value as Uint8Array).toString()}`)
            const decodedKey = HistoryNetworkContentKeyUnionType.deserialize(key)
            // Store content in local DB
            await this.addContentToHistory(
              decodedKey.value.chainId,
              decodedKey.selector,
              toHexString(decodedKey.value.blockHash),
              Buffer.from(decoded.value as Uint8Array).toString()
            )
            break
          }
          case 2: {
            this.log(`received ${decoded.value.length} ENRs`)
            decoded.value.forEach(async (enr) => {
              const decodedEnr = ENR.decode(Buffer.from(enr as Uint8Array))
              this.log(`Node ID: ${decodedEnr.nodeId}`)
              if (!this.historyNetworkRoutingTable.getValue(decodedEnr.nodeId)) {
                this.client.addEnr(decodedEnr)
              }
              await this.db.get(getContentIdFromSerializedKey(key), (err) => {
                if (err) {
                  // Checks to see if content is already stored locally (from a previous lookup) and continues the lookup if not
                  this.sendFindContent(decodedEnr.nodeId, key, networkId)
                }
              })
            })
            break
          }
        }
        return decoded.value
      }
    } catch (err: any) {
      this.log(`Error sending FINDCONTENT to ${shortId(dstId)} - ${err.message}`)
    }
  }

  /**
   * Offers content corresponding to `contentKeys` to peer corresponding to `dstId`
   * @param dstId node ID of a peer
   * @param contentKeys content keys being offered as specified by the subnetwork
   * @param networkId network ID of subnetwork being used
   */
  public sendOffer = async (dstId: string, contentKeys: Uint8Array[], networkId: SubNetworkIds) => {
    const offerMsg: OfferMessage = {
      contentKeys,
    }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.OFFER,
      value: offerMsg,
    })
    this.log(`Sending OFFER message to ${shortId(dstId)}`)
    const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
    if (res.length > 0) {
      try {
        const decoded = PortalWireMessageType.deserialize(res)
        if (decoded.selector === MessageCodes.ACCEPT) {
          this.log(`Received ACCEPT message from ${shortId(dstId)}`)
          this.log(decoded.value)
          const msg = decoded.value as AcceptMessage
          const id = Buffer.from(msg.connectionId).readUInt16BE(0)
          // Initiate uTP streams with serving of requested content
          const requested: Uint8Array[] = contentKeys.filter(
            (n, idx) => msg.contentKeys[idx] === true
          )
          await this.uTP.initiateUtpFromAccept(dstId, id, requested)
          return msg.contentKeys
        }
      } catch (err: any) {
        this.log(`Error sending to ${shortId(dstId)} - ${err.message}`)
      }
    }
  }

  public sendUtpStreamRequest = async (dstId: string, id: number) => {
    // Initiate a uTP stream request with a SYN packet
    await this.uTP.initiateConnectionRequest(dstId, id)
  }

  /**
   * Convenience method to add content for the History Network to the DB
   * @param chainId - decimal number representing chain Id
   * @param blockHash - hex string representation of block hash
   * @param contentType - content type of the data item being stored
   * @param value - hex string representing RLP encoded blockheader, block body, or block receipt
   * @throws if `blockHash` or `value` is not hex string
   */
  public addContentToHistory = async (
    chainId: number,
    contentType: HistoryNetworkContentTypes,
    blockHash: string,
    value: string
  ) => {
    if (!(blockHash.startsWith('0x') || !value.startsWith('0x'))) {
      throw new Error('blockhash and values must be hex strings')
    }
    const encodedValue = Buffer.from(fromHexString(value))
    let deserializedValue: Block | BlockHeader | undefined = undefined
    switch (contentType) {
      case HistoryNetworkContentTypes.BlockHeader: {
        try {
          deserializedValue = BlockHeader.fromRLPSerializedHeader(encodedValue)
        } catch (err: any) {
          this.log(`Invalid value provided for block header: ${err.toString()}`)
        }
        break
      }
      case HistoryNetworkContentTypes.BlockBody: {
        try {
          deserializedValue = Block.fromRLPSerializedBlock(encodedValue)
        } catch (err: any) {
          this.log(`Invalid value provided for block body: ${err.toString()}`)
        }
        break
      }
      case HistoryNetworkContentTypes.Receipt:
        throw new Error('Receipts data not implemented')
      default:
        throw new Error('unknown data type provided')
    }
    const key = getContentId(chainId, blockHash, contentType)
    if (deserializedValue && contentType === HistoryNetworkContentTypes.BlockBody) {
      // If content received is full block, store blockheader separately
      // TODO: Figure out how to efficiently store block once but retrieve content based on either Block Header or Block Body content Type
      const serializedHeader =
        '0x' + (deserializedValue as Block).header.serialize().toString('hex')
      const headerKey = getContentId(chainId, blockHash, 0)
      await this.db.put(headerKey, serializedHeader, (err: any) => {
        if (err) this.log(`Error putting content in history DB: ${err}`)
      })
      this.log(`added blockheader for ${blockHash} to content DB`)
    }
    await this.db.put(key, value, (err: any) => {
      if (err) this.log(`Error putting content in history DB: ${err.toString()}`)
    })
    this.log(
      `added ${
        Object.keys(HistoryNetworkContentTypes)[
          Object.values(HistoryNetworkContentTypes).indexOf(contentType)
        ]
      } for ${blockHash} to content db`
    )

    // Offer stored content to nearest 1 nodes that should be interested (i.e. have a radius >= log2Distance from the content)
    // TODO: Make # nodes content is offered to configurable based on further discussion
    const offerENRs = this.historyNetworkRoutingTable.nearest(key, 1)
    if (offerENRs.length > 0) {
      const encodedKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: contentType,
        value: { chainId: chainId, blockHash: fromHexString(blockHash) },
      })
      offerENRs.forEach((enr) => {
        if (
          log2Distance(enr.nodeId, key) < this.historyNetworkRoutingTable.getRadius(enr.nodeId)!
        ) {
          this.sendOffer(enr.nodeId, [encodedKey], SubNetworkIds.HistoryNetwork)
        }
      })
    }
  }

  private sendPong = async (srcId: string, reqId: bigint) => {
    const customPayload = PingPongCustomDataType.serialize({ radius: BigInt(this.nodeRadius) })
    const payload = {
      enrSeq: this.client.enr.seq,
      customPayload: customPayload,
    }
    const pongMsg = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: payload,
    })
    this.client.sendTalkResp(srcId, reqId, Buffer.from(pongMsg))
  }

  private onTalkReq = async (src: INodeAddress, sourceId: ENR | null, message: ITalkReqMessage) => {
    const srcId = src.nodeId
    switch (toHexString(message.protocol)) {
      case SubNetworkIds.StateNetwork:
        this.log(`Received State Subnetwork request`)
        break
      case SubNetworkIds.HistoryNetwork:
        this.log(`Received History Subnetwork request`)
        break
      case SubNetworkIds.UTPNetwork:
        this.log(`Received uTP packet`)
        this.handleUTP(srcId, message.id, message.request)
        return
      default:
        this.log(
          `Received TALKREQ message on unsupported protocol ${toHexString(message.protocol)}`
        )
        return
    }

    const messageType = message.request[0]
    this.log(`TALKREQUEST message received from ${srcId}`)
    switch (messageType) {
      case MessageCodes.PING:
        this.handlePing(srcId, message)
        break
      case MessageCodes.PONG:
        this.log(`PONG message not expected in TALKREQ`)
        break
      case MessageCodes.FINDNODES:
        this.handleFindNodes(srcId, message)
        break
      case MessageCodes.NODES:
        this.log(`NODES message not expected in TALKREQ`)
        break
      case MessageCodes.FINDCONTENT:
        this.handleFindContent(srcId, message)
        break
      case MessageCodes.CONTENT:
        this.log(`ACCEPT message not expected in TALKREQ`)
        break
      case MessageCodes.OFFER:
        this.handleOffer(srcId, message)
        break
      case MessageCodes.ACCEPT:
        this.log(`ACCEPT message not expected in TALKREQ`)
        break
      default:
        this.log(`Unrecognized message type received`)
    }
  }

  private onTalkResp = (src: INodeAddress, sourceId: ENR | null, message: ITalkRespMessage) => {
    const srcId = src.nodeId
    this.log(`TALKRESPONSE message received from ${srcId}, ${message.toString()}`)
  }

  private handleStreamedContent(rcvId: number, content: Uint8Array) {
    this.log(`received all content for ${rcvId}`)
    const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(content))
    this.addContentToHistory(
      1,
      HistoryNetworkContentTypes.BlockHeader,
      toHexString(header.hash()),
      toHexString(content)
    )
  }

  private handlePing = (srcId: string, message: ITalkReqMessage) => {
    const decoded = PortalWireMessageType.deserialize(message.request)
    const pingMessage = decoded.value as PingMessage
    this.updateSubnetworkRoutingTable(
      srcId,
      toHexString(message.protocol) as SubNetworkIds,
      pingMessage.customPayload
    )
    // Check to see if node is already in corresponding network routing table and add if not
    this.sendPong(srcId, message.id)
  }

  private handleFindNodes = (srcId: string, message: ITalkReqMessage) => {
    const decoded = PortalWireMessageType.deserialize(message.request)
    this.log(`Received FINDNODES request from ${shortId(srcId)}`)
    this.log(decoded)
    const payload = decoded.value as FindNodesMessage
    if (payload.distances.length > 0) {
      const nodesPayload: NodesMessage = {
        total: 0,
        enrs: [],
      }
      payload.distances.forEach((distance) => {
        if (distance > 0) {
          // Any distance > 0 is technically distance + 1 in the routing table index since a node of distance 1
          // would be in bucket 0
          this.historyNetworkRoutingTable.valuesOfDistance(distance + 1).forEach((enr) => {
            // Exclude ENR from resopnse if it matches the requesting node
            if (enr.nodeId === srcId) return
            nodesPayload.total++
            nodesPayload.enrs.push(enr.encode())
          })
        }
      })
      // Send the client's ENR if a node at distance 0 is requested
      if (typeof payload.distances.find((res) => res === 0) === 'number') {
        nodesPayload.total++
        nodesPayload.enrs.push(this.client.enr.encode())
      }
      const encodedPayload = PortalWireMessageType.serialize({
        selector: MessageCodes.NODES,
        value: nodesPayload,
      })
      this.client.sendTalkResp(srcId, message.id, encodedPayload)
    } else {
      this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
    }
  }

  private handleOffer = async (srcId: string, message: ITalkReqMessage) => {
    const decoded = PortalWireMessageType.deserialize(message.request)
    this.log(`Received OFFER request from ${shortId(srcId)}`)
    this.log(decoded)
    const msg = decoded.value as OfferMessage
    if (msg.contentKeys.length > 0) {
      let offerAccepted = false
      try {
        await Promise.all(
          msg.contentKeys.map(async (contentKey) => {
            await this.db.get(getContentIdFromSerializedKey(contentKey), (err) => {
              if (err) {
                offerAccepted = true
                this.sendAccept(srcId, message)
              }
            })
          })
        )
        if (!offerAccepted) {
          this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
        }
      } catch {
        // Send empty response if something goes wrong parsing content keys
        this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
      }
    }
  }

  private sendAccept = async (srcId: string, message: ITalkReqMessage) => {
    const id = randUint16()
    const connectionId = await this.uTP.awaitConnectionRequest(srcId, id).then((_res) => {
      return this.uTP.sockets[srcId].sndConnectionId
    })
    const payload: AcceptMessage = {
      connectionId: new Uint8Array(2).fill(connectionId),
      contentKeys: [true],
    }
    const encodedPayload = PortalWireMessageType.serialize({
      selector: MessageCodes.ACCEPT,
      value: payload,
    })
    await this.client.sendTalkResp(srcId, message.id, Buffer.from(encodedPayload))
  }

  private handleFindContent = async (srcId: string, message: ITalkReqMessage) => {
    const decoded = PortalWireMessageType.deserialize(message.request)
    this.log(`Received FINDCONTENT request from ${shortId(srcId)}`)
    this.log(decoded)
    const decodedContentMessage = decoded.value as FindContentMessage
    //Check to see if value in locally maintained state network state
    const lookupKey = getContentIdFromSerializedKey(decodedContentMessage.contentKey)
    let value = Uint8Array.from([])

    try {
      value = Buffer.from(await this.db.get(lookupKey))
    } catch (err: any) {
      this.log(`Error retrieving content -- ${err.toString()}`)
    }

    if (value.length === 0) {
      switch (toHexString(message.protocol)) {
        case SubNetworkIds.HistoryNetwork:
          {
            const ENRs = this.historyNetworkRoutingTable.nearest(
              getContentIdFromSerializedKey(decodedContentMessage.contentKey),
              1
            )
            // TODO: Verify that ENRs are actually closer than us to content
            this.log(`Found ${ENRs.length} closer to content than us`)
            const encodedEnrs = ENRs.map((enr) =>
              enr.nodeId !== srcId ? enr.encode() : undefined
            ).filter((enr) => enr !== undefined)
            if (encodedEnrs.length > 0) {
              // @ts-ignore
              const payload = ContentMessageType.serialize({ selector: 2, value: encodedEnrs })
              this.client.sendTalkResp(
                srcId,
                message.id,
                Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)])
              )
            } else {
              this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
            }
          }
          break
        default:
          this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
      }
    } else if (value && value.length < MAX_PACKET_SIZE) {
      this.log(
        'Found value for requested content' +
          Buffer.from(decodedContentMessage.contentKey).toString('hex') +
          value.slice(0, 10) +
          `...`
      )
      const payload = ContentMessageType.serialize({ selector: 1, value: value })
      this.client.sendTalkResp(
        srcId,
        message.id,
        Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)])
      )
    } else {
      this.log(
        'Found value for requested content.  Larger than 1 packet.  uTP stream needed.' +
          Buffer.from(decodedContentMessage.contentKey).toString('hex') +
          value.slice(0, 10) +
          `...`
      )
      this.uTP.contents[srcId] = value
      this.log(`Generating Random Connection Id...`)
      const _id = randUint16()
      const idBuffer = Buffer.alloc(2)
      idBuffer.writeUInt16BE(_id, 0)
      const id = Uint8Array.from(idBuffer)
      this.log(`Sending FOUND_CONTENT message with CONNECTION ID: ${_id}`)
      const payload = ContentMessageType.serialize({ selector: 0, value: id })
      this.client.sendTalkResp(
        srcId,
        message.id,
        Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)])
      )
    }
  }

  /**
   *
   * @param srcId nodeID that uTP packet originates from
   * @param msgId uTP message ID
   * @param packetBuffer uTP packet encoded to Buffer
   */
  private handleUTP = async (srcId: string, msgId: bigint, packetBuffer: Buffer) => {
    await this.client.sendTalkResp(srcId, msgId, new Uint8Array())
    const packet = bufferToPacket(packetBuffer)
    await this.uTP.handleUtpPacket(packet, srcId, msgId)
  }

  /**
   *
   * This method maintains the liveness of peers in the Subnetwork routing tables.  If a PONG message is received from
   * an unknown peer for a given subnetwork, that peer is added to the corresponding subnetwork routing table.  If this
   * method is called with no `customPayload`, this indicates the peer corresponding to `srcId` should be removed from
   * the specified subnetwork routing table.
   * @param srcId nodeId of peer being updated in subnetwork routing table
   * @param networkId subnetwork Id of routing table being updated
   * @param customPayload payload of the PING/PONG message being decoded
   */
  private updateSubnetworkRoutingTable = (
    srcId: NodeId,
    networkId: SubNetworkIds,
    customPayload?: any
  ) => {
    const enr = this.client.getKadValue(srcId)
    if (!enr && customPayload) {
      this.log(
        `no ENR found in routing table for ${srcId} - can't be added to ${
          Object.keys(SubNetworkIds)[Object.values(SubNetworkIds).indexOf(networkId)]
        } routing table`
      )
      return
    }
    switch (networkId) {
      case SubNetworkIds.StateNetwork: {
        if (!customPayload) {
          this.stateNetworkRoutingTable.removeById(srcId)
          this.stateNetworkRoutingTable.removeFromRadiusMap(srcId)
          this.log(`removed ${srcId} from State Network Routing Table`)
          return
        }
        if (!this.stateNetworkRoutingTable.getValue(srcId)) {
          this.log(`adding ${srcId} to stateNetwork routing table`)
          this.stateNetworkRoutingTable.insertOrUpdate(enr!, EntryStatus.Connected)
          const decodedPayload = PingPongCustomDataType.deserialize(Uint8Array.from(customPayload))
          this.stateNetworkRoutingTable.updateRadius(srcId, decodedPayload.radius)
          return
        }
        break
      }
      case SubNetworkIds.HistoryNetwork: {
        if (!customPayload) {
          this.historyNetworkRoutingTable.removeById(srcId)
          this.historyNetworkRoutingTable.removeFromRadiusMap(srcId)
          this.log(`removed ${srcId} from History Network Routing Table`)
          return
        }
        if (!this.historyNetworkRoutingTable.getValue(srcId)) {
          this.log(`adding ${srcId} to historyNetwork routing table`)
          this.historyNetworkRoutingTable.insertOrUpdate(enr!, EntryStatus.Connected)
          const decodedPayload = PingPongCustomDataType.deserialize(Uint8Array.from(customPayload))
          this.historyNetworkRoutingTable.updateRadius(srcId, decodedPayload.radius)
          return
        }
        break
      }
    }
  }

  /**
   *
   * @param dstId `NodeId` of message recipient
   * @param payload `Buffer` serialized payload of message
   * @param networkId Subnetwork ID of Subnetwork message is being sent on
   * @returns response from `dstId` as `Buffer` or null `Buffer`
   */
  private sendPortalNetworkMessage = async (
    dstId: NodeId,
    payload: Buffer,
    networkId: SubNetworkIds
  ): Promise<Buffer> => {
    try {
      const res = await this.client.sendTalkReq(dstId, payload, fromHexString(networkId))
      return res
    } catch (err: any) {
      this.log(`Error sending TALKREQ message: ${err.message}`)
      this.updateSubnetworkRoutingTable(dstId, networkId)
      return Buffer.from([0])
    }
  }

  /**
   * Follows below algorithm to refresh a bucket in the History Network routing table
   * 1: Look at your routing table and select the first N buckets which are not full.
   * Any value of N < 10 is probably fine here.
   * 2: Randomly pick one of these buckets.  eighting this random selection to prefer
   * "larger" buckets can be done here to prioritize finding the easier to find nodes first.
   * 3: Randomly generate a NodeID that falls within this bucket.
   * Do the random lookup on this node-id.
   * The lookup is conducted at the `discv5` routing table level since `discv5` already
   * has the lookup logic built and any nodes found via the discv5 lookup will be adding to
   * the History Network Routing Table if they support that subnetwork.
   */
  private bucketRefresh = async () => {
    // TODO Rework bucket refresh logic given most nodes will be at log2distance ~>240
    const notFullBuckets = this.historyNetworkRoutingTable.buckets
      .map((bucket, idx) => {
        return { bucket: bucket, distance: idx }
      })
      .filter((pair) => pair.bucket.size() < 16)
    const randomNotFullBucket = Math.trunc(Math.random() * 10)
    this.log(`Refreshing bucket at distance ${randomNotFullBucket}`)
    const distance = notFullBuckets[randomNotFullBucket].distance
    const randomNodeAtDistance = generateRandomNodeIdAtDistance(this.client.enr.nodeId, distance)
    this.client.findNode(randomNodeAtDistance)
  }
}
