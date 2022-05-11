import {
  createKeypairFromPeerId,
  Discv5,
  distance,
  ENR,
  EntryStatus,
  IDiscv5CreateOptions,
  NodeId,
} from '@chainsafe/discv5'
import { ITalkReqMessage, ITalkRespMessage } from '@chainsafe/discv5/lib/message'
import { EventEmitter } from 'events'
import debug, { Debugger } from 'debug'
import { BitArray, fromHexString, toHexString } from '@chainsafe/ssz'
import { StateNetworkRoutingTable } from '..'
import { generateRandomNodeIdAtDistance, serializedContentKeyToContentId, shortId } from '../util'
import { randUint16 } from '../wire/utp'
import {
  PingPongCustomDataType,
  MessageCodes,
  FindNodesMessage,
  NodesMessage,
  PortalWireMessageType,
  FindContentMessage,
  ContentMessageType,
  OfferMessage,
  AcceptMessage,
  PongMessage,
  PingMessage,
  NodeLookup,
} from '../wire'
import { SubprotocolIds } from '../subprotocols'
import { PortalNetworkEventEmitter, PortalNetworkMetrics, RoutingTable } from './types'
import { PortalNetworkRoutingTable } from '.'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import { LevelUp } from 'levelup'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo'
import {
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
} from '../subprotocols/history/types'
import { BlockHeader } from '@ethereumjs/block'
import { getHistoryNetworkContentId, reassembleBlock } from '../subprotocols/history'
import { ContentLookup } from '../wire'
import { PortalNetworkUTP, RequestCode } from '../wire/utp/PortalNetworkUtp/PortalNetworkUTP'
import { WebSocketTransportService } from '../transports/websockets'
import { CapacitorUDPTransportService } from '../transports/capacitorUdp'
import { identity } from '@chainsafe/persistent-merkle-tree'
const level = require('level-mem')

const MAX_PACKET_SIZE = 1280

export class PortalNetwork extends (EventEmitter as { new (): PortalNetworkEventEmitter }) {
  client: Discv5
  routingTables: Map<SubprotocolIds, RoutingTable>
  uTP: PortalNetworkUTP
  nodeRadius: bigint
  db: LevelUp
  bootnodes: string[]
  prev_content?: string[][]
  private refreshListener?: ReturnType<typeof setInterval>
  metrics: PortalNetworkMetrics | undefined
  logger: Debugger
  private supportsRendezvous: boolean

  /**
   *
   * @param ip initial local IP address of node
   * @param proxyAddress IP address of proxy
   * @returns a new PortalNetwork instance
   */
  public static createPortalNetwork = async (
    proxyAddress = 'ws://127.0.0.1:5050',
    bootnodes: string[],
    db?: LevelUp,
    ip?: string
  ) => {
    const id = await PeerId.create({ keyType: 'secp256k1' })
    const enr = ENR.createFromPeerId(id)
    const ma = ip
      ? new Multiaddr(`/ip4/${ip}/udp/${Math.floor(Math.random() * 20)}`)
      : new Multiaddr()
    if (ip) enr.setLocationMultiaddr(ma)
    return new PortalNetwork(
      {
        enr,
        peerId: id,
        multiaddr: ma,
        transport: new WebSocketTransportService(ma, enr.nodeId, proxyAddress),
        config: {
          addrVotesToUpdateEnr: 5,
          enrUpdate: true,
        },
      },
      2n ** 256n,
      bootnodes,
      db
    )
  }
  /**
   *
   * @param proxyAddress IP address of proxy
   * @param peerId stored peerId
   * @param storedENR stored enr
   * @returns a new PortalNetwork instance
   */
  public static recreatePortalNetwork = async (
    proxyAddress = 'ws://127.0.0.1:5050',
    LDB: LevelUp
  ) => {
    const prev_enr_string = await LDB.get('enr')
    const prev_peerid = await LDB.get('peerid')
    const recreatedENR: ENR = ENR.decodeTxt(prev_enr_string)
    const recreatedPeerId = await PeerId.createFromJSON(prev_peerid)
    const prev_peers = JSON.parse(await LDB.get('peers'))
    console.log('recreating routing table', prev_peers.length)
    if (PeerId.isPeerId(recreatedPeerId) && recreatedENR.keypair.privateKeyVerify()) {
      console.log(`Recreating Portal Network client`)
      const portal = new PortalNetwork(
        {
          enr: recreatedENR,
          peerId: recreatedPeerId,
          multiaddr: recreatedENR.getLocationMultiaddr('udp')!,
          transport: new WebSocketTransportService(
            recreatedENR.getLocationMultiaddr('udp')!,
            recreatedENR.nodeId,
            proxyAddress
          ),
          config: {
            addrVotesToUpdateEnr: 1,
            enrUpdate: true,
          },
        },
        2n ** 256n,
        prev_peers,
        LDB
      )
      return portal
    } else {
      throw new Error('Cannot recreate Portal Network from stored data')
    }
  }

  public static createMobilePortalNetwork = async (bootnodes: string[], ip?: string) => {
    const id = await PeerId.create({ keyType: 'secp256k1' })
    const enr = ENR.createFromPeerId(id)
    const ma = ip
      ? new Multiaddr(`/ip4/${ip}/udp/${Math.floor(Math.random() * 200)}`)
      : new Multiaddr()
    if (ip) enr.setLocationMultiaddr(ma)
    return new PortalNetwork(
      {
        enr,
        peerId: id,
        multiaddr: ma,
        transport: new CapacitorUDPTransportService(ma, enr.nodeId),
        config: {
          addrVotesToUpdateEnr: 5,
          enrUpdate: true,
        },
      },
      2n ** 256n,
      bootnodes
    )
  }

  /**
   *
   * Portal Network constructor
   * @param config a dictionary of `IDiscv5CreateOptions` for configuring the discv5 networking layer
   * @param radius defines the radius of data the node is interesting in storing
   * @param db a `level` compliant database provided by the module consumer - instantiates an in-memory DB if not provided
   */
  constructor(
    config: IDiscv5CreateOptions,
    radius = 2n ** 256n,
    bootnodes: string[],
    db?: LevelUp,
    metrics?: PortalNetworkMetrics,
    supportsRendezvous = false
  ) {
    // eslint-disable-next-line constructor-super
    super()
    this.client = Discv5.create({
      ...config,
      ...{ requestTimeout: 3000, allowUnverifiedSessions: false },
    })
    this.client.enr.encode(createKeypairFromPeerId(config.peerId).privateKey)
    this.logger = debug(this.client.enr.nodeId.slice(0, 5)).extend('portalnetwork')
    this.nodeRadius = radius
    this.routingTables = new Map()
    this.bootnodes = bootnodes
    Object.values(SubprotocolIds).forEach((protocolId) => {
      if (protocolId !== SubprotocolIds.UTPNetwork) {
        this.routingTables.set(
          protocolId as SubprotocolIds,
          protocolId === SubprotocolIds.StateNetwork
            ? new StateNetworkRoutingTable(this.client.enr.nodeId)
            : new PortalNetworkRoutingTable(this.client.enr.nodeId)
        )
      }
    })
    this.client.on('talkReqReceived', this.onTalkReq)
    this.client.on('talkRespReceived', this.onTalkResp)
    this.on('ContentAdded', this.gossipHistoryNetworkContent)
    /*  TODO: decide whether to add this code back in since some nodes are naughty and send UDP packets that
    are too big for discv5 and our discv5 implementation automatically evicts these nodes from the discv5
    routing table
    
      this.client.on('sessionEnded', (srcId) => {
        // Remove node from subprotocol routing tables when a session is ended by discv5
        // (i.e. failed a liveness check)
        this.routingTables.forEach((table, protocolId) => {
        if (table.size > 0 && table.getValue(srcId)) {
          this.updateSubprotocolRoutingTable(srcId, protocolId, false)
        }
      })
    })*/
    this.uTP = new PortalNetworkUTP(this)
    this.db = db ?? level()
    if (metrics) {
      this.metrics = metrics
      this.metrics.knownDiscv5Nodes.collect = () =>
        this.metrics?.knownDiscv5Nodes.set(this.client.kadValues().length)
      this.metrics.knownHistoryNodes.collect = () =>
        this.metrics?.knownHistoryNodes.set(
          this.routingTables.get(SubprotocolIds.HistoryNetwork)!.size
        )
    }
    this.supportsRendezvous = supportsRendezvous
  }

  /**
   * Starts the portal network client
   */
  public start = async () => {
    await this.client.start()
    // Start kbucket refresh on 30 second interval
    this.refreshListener = setInterval(() => this.bucketRefresh(), 30000)
    this.bootnodes.forEach(async (peer: string) => {
      await this.addBootNode(peer, SubprotocolIds.HistoryNetwork)
    })
    try {
      await this.db.batch([
        {
          type: 'put',
          key: 'enr',
          value: this.client.enr.encodeTxt(this.client.keypair.privateKey),
        },
        {
          type: 'put',
          key: 'peerid',
          value: JSON.stringify(await this.client.peerId()),
        },
      ])
    } catch (err) {}
  }

  /**
   * Stops the portal network client and cleans up listeners
   */
  public stop = async () => {
    await this.client.stop()
    await this.client.removeAllListeners()
    await this.removeAllListeners()
    await this.db.removeAllListeners()
    await this.db.close()
    this.refreshListener && clearInterval(this.refreshListener)
  }

  /**
   *
   * @param namespaces comma separated list of logging namespaces
   * defaults to "portalnetwork*, discv5:service, <uTP>*"
   */
  public enableLog = (namespaces: string = '*portalnetwork*,*discv5:service*,*uTP*') => {
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
  public set radius(value: bigint) {
    if (value < 0n) {
      throw new Error('radius must be greater than 0')
    }
    this.nodeRadius = value
  }

  /**
   * Adds a bootnode which triggers a `findNodes` request to the Bootnode tp popute the routing table
   * @param bootnode `string` encoded ENR of a bootnode
   * @param protocolId network ID of the subprotocol routing table to add the bootnode to
   */
  public addBootNode = async (bootnode: string, protocolId: SubprotocolIds) => {
    const enr = ENR.decodeTxt(bootnode)
    const routingTable = this.routingTables.get(protocolId)
    if (!routingTable) {
      throw new Error('invalid subprotocol ID provided')
    }
    this.updateSubprotocolRoutingTable(enr, protocolId, true)
    const distancesSought = []
    for (let x = 239; x < 256; x++) {
      // Ask for nodes in all log2distances 239 - 256
      if (routingTable.valuesOfDistance(x).length === 0) {
        distancesSought.push(x)
      }
    }
    // Requests nodes in all empty k-buckets
    ;(this.client as any).sendPing(enr)
    this.sendFindNodes(enr.nodeId, distancesSought, protocolId)
  }

  /**
   * Sends a Portal Network Wire Protocol PING message to a specified node
   * @param dstId the nodeId of the peer to send a ping to
   * @param payload custom payload to be sent in PING message
   * @param protocolId subprotocol ID
   * @returns the PING payload specified by the subprotocol or undefined
   */
  public sendPing = async (nodeId: string | ENR, protocolId: SubprotocolIds) => {
    let dstId
    if (nodeId instanceof ENR) {
      this.updateSubprotocolRoutingTable(nodeId, protocolId, true)
      dstId = nodeId.nodeId
    } else if (typeof nodeId === 'string' && nodeId.startsWith('enr')) {
      const enr = ENR.decodeTxt(nodeId)
      this.updateSubprotocolRoutingTable(enr, protocolId, true)
      dstId = enr.nodeId
      ;(this.client as any).sendPing(enr)
    } else {
      dstId = nodeId
    }
    const pingMsg = PortalWireMessageType.serialize({
      selector: MessageCodes.PING,
      value: {
        enrSeq: this.client.enr.seq,
        customPayload: PingPongCustomDataType.serialize({ radius: BigInt(this.nodeRadius) }),
      },
    })
    try {
      this.logger(
        `Sending PING to ${shortId(dstId)} for ${SubprotocolIds.HistoryNetwork} subprotocol`
      )
      const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(pingMsg), protocolId)
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.PONG) {
        this.logger(`Received PONG from ${shortId(dstId)}`)
        const decoded = PortalWireMessageType.deserialize(res)
        const pongMessage = decoded.value as PongMessage
        this.updateSubprotocolRoutingTable(dstId, protocolId, true, pongMessage.customPayload)
        return pongMessage
      }
    } catch (err: any) {
      this.logger(`Error during PING request to ${shortId(dstId)}: ${err.toString()}`)
      this.updateSubprotocolRoutingTable(dstId, protocolId, false)
      return undefined
    }
  }

  /**
   *
   * Sends a Portal Network FINDNODES request to a peer requesting other node ENRs
   * @param dstId node id of peer
   * @param distances distances as defined by subprotocol for node ENRs being requested
   * @param protocolId subprotocol id for message being
   * @returns a {@link `NodesMessage`} or undefined
   */
  public sendFindNodes = async (dstId: string, distances: number[], protocolId: SubprotocolIds) => {
    this.metrics?.findNodesMessagesSent.inc()
    const findNodesMsg: FindNodesMessage = { distances: distances }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDNODES,
      value: findNodesMsg,
    })
    try {
      this.logger(`Sending FINDNODES to ${shortId(dstId)} for ${protocolId} subprotocol`)
      const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), protocolId)
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.NODES) {
        this.metrics?.nodesMessagesReceived.inc()
        this.logger(`Received NODES from ${shortId(dstId)}`)
        const decoded = PortalWireMessageType.deserialize(res).value as NodesMessage
        if (decoded) {
          this.logger(`Received ${decoded.total} ENRs from ${shortId(dstId)}`)
          const routingTable = this.routingTables.get(protocolId)
          decoded.enrs.forEach((enr) => {
            const decodedEnr = ENR.decode(Buffer.from(enr))
            this.logger(decodedEnr.nodeId)
            if (routingTable && !routingTable.getValue(decodedEnr.nodeId)) {
              // Ping node if not currently in subprotocol routing table
              this.sendPing(decodedEnr, protocolId)
            } else {
              this.logger(`We already know ${shortId(decodedEnr.nodeId)}`)
            }
          })
          return decoded
        }
      }
    } catch (err: any) {
      this.logger(`Error sending FINDNODES to ${shortId(dstId)} - ${err}`)
    }
  }

  public historyNetworkContentLookup = async (
    contentType: HistoryNetworkContentTypes,
    blockHash: string
  ) => {
    const contentKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: contentType,
      value: { chainId: 1, blockHash: fromHexString(blockHash) },
    })
    const lookup = new ContentLookup(this, contentKey, SubprotocolIds.HistoryNetwork)
    const res = await lookup.startLookup()
    return res
  }

  /**
   * Starts recursive lookup for content corresponding to `key`
   * @param dstId node id of peer
   * @param key content key defined by the subprotocol spec
   * @param protocolId subprotocol ID on which content is being sought
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (dstId: string, key: Uint8Array, protocolId: SubprotocolIds) => {
    this.metrics?.findContentMessagesSent.inc()
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    this.logger(`Sending FINDCONTENT to ${shortId(dstId)} for ${protocolId} subprotocol`)
    const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), protocolId)
    try {
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.CONTENT) {
        this.metrics?.contentMessagesReceived.inc()
        this.logger(`Received FOUNDCONTENT from ${shortId(dstId)}`)
        // TODO: Switch this to use PortalWireMessageType.deserialize if type inference can be worked out
        const decoded = ContentMessageType.deserialize(res.slice(1))
        switch (decoded.selector) {
          case 0: {
            const id = Buffer.from(decoded.value as Uint8Array).readUInt16BE(0)
            this.logger(`received uTP Connection ID ${id}`)
            await this.uTP.handleNewHistoryNetworkRequest(
              [key],
              dstId,
              id,
              RequestCode.FINDCONTENT_READ,
              []
            )
            break
          }
          case 1: {
            this.logger(`received content`)
            this.logger(decoded.value)
            const decodedKey = HistoryNetworkContentKeyUnionType.deserialize(key)
            // Store content in local DB
            try {
              switch (protocolId) {
                // TODO: Decide how to deal with managing content for additional Subprotocols
                case SubprotocolIds.HistoryNetwork:
                  this.addContentToHistory(
                    decodedKey.value.chainId,
                    decodedKey.selector,
                    toHexString(Buffer.from(decodedKey.value.blockHash)),
                    decoded.value as Uint8Array
                  )
                  break
                default:
                  this.logger(`${protocolId} network is not supported for FOUNDCONTENT`)
              }
            } catch {
              this.logger('Error adding content to DB')
            }
            break
          }
          case 2: {
            this.logger(`received ${decoded.value.length} ENRs`)
            break
          }
        }
        return decoded
      }
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(dstId)} - ${err.message}`)
    }
  }

  /**
   * Offers content corresponding to `contentKeys` to peer corresponding to `dstId`
   * @param dstId node ID of a peer
   * @param contentKeys content keys being offered as specified by the subprotocol
   * @param protocolId network ID of subprotocol being used
   */
  public sendOffer = async (
    dstId: string,
    contentKeys: Uint8Array[],
    protocolId: SubprotocolIds
  ) => {
    this.metrics?.offerMessagesSent.inc()
    const offerMsg: OfferMessage = {
      contentKeys,
    }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.OFFER,
      value: offerMsg,
    })
    this.logger(`Sending OFFER message to ${shortId(dstId)}`)
    const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), protocolId)
    if (res.length > 0) {
      try {
        const decoded = PortalWireMessageType.deserialize(res)
        if (decoded.selector === MessageCodes.ACCEPT) {
          this.metrics?.acceptMessagesReceived.inc()
          this.logger(`Received ACCEPT message from ${shortId(dstId)}`)
          this.logger(decoded.value)
          const msg = decoded.value as AcceptMessage
          const id = Buffer.from(msg.connectionId).readUInt16BE(0)
          // Initiate uTP streams with serving of requested content
          const requestedKeys: Uint8Array[] = contentKeys.filter(
            (n, idx) => msg.contentKeys.get(idx) === true
          )

          if (requestedKeys.length === 0) {
            // Don't start uTP stream if no content ACCEPTed
            this.logger(`Received ACCEPT with no desired content from ${shortId(dstId)}`)
            return []
          }

          const requestedData: Uint8Array[] = []
          await Promise.all(
            requestedKeys.map(async (key) => {
              let value = Uint8Array.from([])
              const lookupKey = serializedContentKeyToContentId(key)
              try {
                value = fromHexString(await this.db.get(lookupKey))
                requestedData.push(value)
              } catch (err: any) {
                this.logger(`Error retrieving content -- ${err.toString()}`)
                requestedData.push(value)
              }
            })
          )

          await this.uTP.handleNewHistoryNetworkRequest(
            requestedKeys,
            dstId,
            id,
            RequestCode.OFFER_WRITE,
            requestedData
          )

          return msg.contentKeys
        }
      } catch (err: any) {
        this.logger(`Error sending to ${shortId(dstId)} - ${err.message}`)
      }
    }
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
    value: Uint8Array
  ) => {
    const contentId = getHistoryNetworkContentId(chainId, blockHash, contentType)

    switch (contentType) {
      case HistoryNetworkContentTypes.BlockHeader: {
        try {
          BlockHeader.fromRLPSerializedHeader(Buffer.from(value))
          this.db.put(contentId, toHexString(value), (err: any) => {
            if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
          })
        } catch (err: any) {
          this.logger(`Invalid value provided for block header: ${err.toString()}`)
          return
        }
        break
      }
      case HistoryNetworkContentTypes.BlockBody: {
        let validBlock = false
        try {
          const headerContentId = getHistoryNetworkContentId(
            1,
            blockHash,
            HistoryNetworkContentTypes.BlockHeader
          )
          const hexHeader = await this.db.get(headerContentId)
          // Verify we can construct a valid block from the header and body provided
          reassembleBlock(fromHexString(hexHeader), value)
          validBlock = true
        } catch {
          this.logger(
            `Block Header for ${shortId(blockHash)} not found locally.  Querying network...`
          )
          const serializedHeader = await this.historyNetworkContentLookup(0, blockHash)
          try {
            reassembleBlock(serializedHeader as Uint8Array, value)
            validBlock = true
          } catch {}
        }
        if (validBlock) {
          this.db.put(contentId, toHexString(value), (err: any) => {
            if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
          })
        } else {
          this.logger(`Could not verify block content`)
          // Don't store block body where we can't assemble a valid block
          return
        }
        break
      }
      case HistoryNetworkContentTypes.Receipt:
        throw new Error('Receipts data not implemented')
      default:
        throw new Error('unknown data type provided')
    }
    // await this.db.put(key, toHexString(value), (err: any) => {
    //   if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
    // })
    this.emit('ContentAdded', blockHash, contentType, toHexString(value))
    this.logger(
      `added ${
        Object.keys(HistoryNetworkContentTypes)[
          Object.values(HistoryNetworkContentTypes).indexOf(contentType)
        ]
      } for ${blockHash} to content db`
    )
  }

  private sendPong = async (src: INodeAddress, message: ITalkReqMessage) => {
    const payload = {
      enrSeq: this.client.enr.seq,
      customPayload: PingPongCustomDataType.serialize({ radius: BigInt(this.nodeRadius) }),
    }
    const pongMsg = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: payload,
    })
    this.sendPortalNetworkResponse(src, message, Buffer.from(pongMsg))
  }

  private onTalkReq = async (src: INodeAddress, sourceId: ENR | null, message: ITalkReqMessage) => {
    this.metrics?.totalBytesReceived.inc(message.request.length)
    const srcId = src.nodeId
    switch (toHexString(message.protocol)) {
      // TODO: Add handling for other subnetworks as functionality is added
      case SubprotocolIds.HistoryNetwork:
        this.logger(`Received History subprotocol request`)
        break
      case SubprotocolIds.UTPNetwork:
        this.logger(`Received uTP packet`)
        this.handleUTP(src, srcId, message, message.request)
        return
      case SubprotocolIds.Rendezvous:
        this.handleRendezvous(src, srcId, message)
        return
      default:
        this.logger(
          `Received TALKREQ message on unsupported protocol ${toHexString(message.protocol)}`
        )
        return
    }

    const messageType = message.request[0]
    this.logger(`TALKREQUEST with ${MessageCodes[messageType]} message received from ${srcId}`)
    switch (messageType) {
      case MessageCodes.PING:
        this.handlePing(src, message)
        break
      case MessageCodes.PONG:
        this.logger(`PONG message not expected in TALKREQ`)
        break
      case MessageCodes.FINDNODES:
        this.metrics?.findNodesMessagesReceived.inc()
        this.handleFindNodes(src, message)
        break
      case MessageCodes.NODES:
        this.logger(`NODES message not expected in TALKREQ`)
        break
      case MessageCodes.FINDCONTENT:
        this.metrics?.findContentMessagesReceived.inc()
        this.handleFindContent(src, message)
        break
      case MessageCodes.CONTENT:
        this.logger(`ACCEPT message not expected in TALKREQ`)
        break
      case MessageCodes.OFFER:
        this.metrics?.offerMessagesReceived.inc()
        this.handleOffer(src, message)
        break
      case MessageCodes.ACCEPT:
        this.logger(`ACCEPT message not expected in TALKREQ`)
        break
      default:
        this.logger(`Unrecognized message type received`)
    }
  }

  private onTalkResp = (src: INodeAddress, sourceId: ENR | null, message: ITalkRespMessage) => {
    this.metrics?.totalBytesReceived.inc(message.response.length)
    const srcId = src.nodeId
    this.logger(`TALKRESPONSE message received from ${srcId}`)
  }

  private handlePing = (src: INodeAddress, message: ITalkReqMessage) => {
    const decoded = PortalWireMessageType.deserialize(message.request)
    const pingMessage = decoded.value as PingMessage
    const routingTable = this.routingTables.get(toHexString(message.protocol) as SubprotocolIds)
    if (!routingTable?.getValue(src.nodeId)) {
      // Check to see if node is already in corresponding network routing table and add if not
      this.updateSubprotocolRoutingTable(
        src.nodeId,
        toHexString(message.protocol) as SubprotocolIds,
        true,
        pingMessage.customPayload
      )
      // If we receive a ping from a node we don't know, that means we're publicly reachable so can support rendezvous
      this.supportsRendezvous = true
    } else {
      const radius = PingPongCustomDataType.deserialize(pingMessage.customPayload).radius

      routingTable.updateRadius(src.nodeId, radius)
    }
    this.sendPong(src, message)
  }

  private handleFindNodes = (src: INodeAddress, message: ITalkReqMessage) => {
    const decoded = PortalWireMessageType.deserialize(message.request)
    this.logger(`Received FINDNODES request from ${shortId(src.nodeId)}`)
    this.logger(decoded)
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
          this.routingTables
            .get(toHexString(message.protocol) as SubprotocolIds)!
            .valuesOfDistance(distance + 1)
            .every((enr) => {
              // Exclude ENR from resopnse if it matches the requesting node
              if (enr.nodeId === src.nodeId) return true
              // Break from loop if total size of NODES payload would exceed 1200 bytes
              // TODO: Add capability to send multiple NODES messages if size of ENRs exceeds packet size
              if (nodesPayload.enrs.flat().length + enr.size > 1200) return false
              nodesPayload.total++
              nodesPayload.enrs.push(enr.encode())
              return true
            })
        }
      })
      // Send the client's ENR if a node at distance 0 is requested
      if (
        payload.distances.findIndex((res) => res === 0) !== -1 &&
        // Verify that total nodes payload is less than 1200 bytes before adding local ENR
        nodesPayload.enrs.flat().length < 1200
      ) {
        nodesPayload.total++
        nodesPayload.enrs.push(this.client.enr.encode())
      }
      const encodedPayload = PortalWireMessageType.serialize({
        selector: MessageCodes.NODES,
        value: nodesPayload,
      })
      this.sendPortalNetworkResponse(src, message, encodedPayload)
      this.metrics?.nodesMessagesSent.inc()
    } else {
      this.sendPortalNetworkResponse(src, message, Buffer.from([]))
    }
  }

  private handleOffer = async (src: INodeAddress, message: ITalkReqMessage) => {
    const decoded = PortalWireMessageType.deserialize(message.request)
    this.logger(decoded)
    const msg = decoded.value as OfferMessage
    this.logger(
      `Received OFFER request from ${shortId(src.nodeId)} with ${
        msg.contentKeys.length
      } pieces of content.`
    )
    try {
      if (msg.contentKeys.length > 0) {
        let offerAccepted = false
        try {
          const contentIds: boolean[] = Array(msg.contentKeys.length).fill(false)

          for (let x = 0; x < msg.contentKeys.length; x++) {
            try {
              await this.db.get(serializedContentKeyToContentId(msg.contentKeys[x]))
              this.logger(`Already have this content ${msg.contentKeys[x]}`)
            } catch (err) {
              this.logger(err)
              offerAccepted = true
              contentIds[x] = true
              this.logger(`Found some interesting content from ${shortId(src.nodeId)}`)
            }
          }
          if (offerAccepted) {
            this.logger(`Accepting an OFFER`)
            const desiredKeys = msg.contentKeys.filter((k, i) => contentIds[i] === true)
            this.sendAccept(src, message, contentIds, desiredKeys)
          } else {
            this.logger(`Declining an OFFER since no interesting content`)
            this.sendPortalNetworkResponse(src, message, Buffer.from([]))
          }
        } catch {
          this.logger(`Something went wrong handling offer message`)
          // Send empty response if something goes wrong parsing content keys
          this.sendPortalNetworkResponse(src, message, Buffer.from([]))
        }
        if (!offerAccepted) {
          this.logger('We already have all this content')
          this.sendPortalNetworkResponse(src, message, Buffer.from([]))
        }
      } else {
        this.logger(`Offer Message Has No Content`)
        // Send empty response if something goes wrong parsing content keys
        this.sendPortalNetworkResponse(src, message, Buffer.from([]))
      }
    } catch {
      this.logger(`Error Processing OFFER msg`)
    }
  }

  private sendAccept = async (
    src: INodeAddress,
    message: ITalkReqMessage,
    desiredContentAccepts: boolean[],
    desiredContentKeys: Uint8Array[]
  ) => {
    this.logger(
      `sending ACCEPT to ${shortId(src.nodeId)} for ${desiredContentKeys.length} pieces of content.`
    )

    this.metrics?.acceptMessagesSent.inc()
    const id = randUint16()
    await this.uTP.handleNewHistoryNetworkRequest(
      desiredContentKeys,
      src.nodeId,
      id,
      RequestCode.ACCEPT_READ,
      []
    )
    const idBuffer = Buffer.alloc(2)
    idBuffer.writeUInt16BE(id, 0)

    const payload: AcceptMessage = {
      connectionId: idBuffer,
      contentKeys: BitArray.fromBoolArray(desiredContentAccepts),
    }
    const encodedPayload = PortalWireMessageType.serialize({
      selector: MessageCodes.ACCEPT,
      value: payload,
    })
    await this.sendPortalNetworkResponse(src, message, Buffer.from(encodedPayload))
  }

  private handleFindContent = async (src: INodeAddress, message: ITalkReqMessage) => {
    this.metrics?.contentMessagesSent.inc()
    const decoded = PortalWireMessageType.deserialize(message.request)
    this.logger(`Received FINDCONTENT request from ${shortId(src.nodeId)}`)
    const decodedContentMessage = decoded.value as FindContentMessage
    //Check to see if value in content db
    const lookupKey = serializedContentKeyToContentId(decodedContentMessage.contentKey)
    let value = Uint8Array.from([])
    try {
      value = Buffer.from(fromHexString(await this.db.get(lookupKey)))
    } catch (err: any) {
      this.logger(`Error retrieving content -- ${err.toString()}`)
    }
    if (value.length === 0) {
      switch (toHexString(message.protocol)) {
        case SubprotocolIds.HistoryNetwork:
          {
            // Discv5 calls for maximum of 16 nodes per NODES message
            const ENRs = this.routingTables
              .get(toHexString(message.protocol) as SubprotocolIds)!
              .nearest(lookupKey, 16)
            const encodedEnrs = ENRs.map((enr) => {
              // Only include ENR if not the ENR of the requesting node and the ENR is closer to the
              // contentId than this node
              return enr.nodeId !== src.nodeId &&
                distance(enr.nodeId, lookupKey) < distance(this.client.enr.nodeId, lookupKey)
                ? enr.encode()
                : undefined
            }).filter((enr) => enr !== undefined)
            if (encodedEnrs.length > 0) {
              this.logger(`Found ${encodedEnrs.length} closer to content than us`)
              // TODO: Add capability to send multiple TALKRESP messages if # ENRs exceeds packet size
              while (encodedEnrs.flat().length > 1200) {
                // Remove ENRs until total ENRs less than 1200 bytes
                encodedEnrs.pop()
              }
              const payload = ContentMessageType.serialize({
                selector: 2,
                value: encodedEnrs as Buffer[],
              })
              this.sendPortalNetworkResponse(
                src,

                message,
                Buffer.concat([Buffer.from([MessageCodes.CONTENT]), payload])
              )
            } else {
              this.logger(`Found no ENRs closer to content than us`)
              this.sendPortalNetworkResponse(src, message, Uint8Array.from([]))
            }
          }
          break
        default:
          this.sendPortalNetworkResponse(src, message, Uint8Array.from([]))
      }
    } else if (value && value.length < MAX_PACKET_SIZE) {
      this.logger(
        'Found value for requested content' +
          Buffer.from(decodedContentMessage.contentKey).toString('hex') +
          value.slice(0, 10) +
          `...`
      )
      const payload = ContentMessageType.serialize({ selector: 1, value: value })
      this.logger(`Sending requested content to ${src.nodeId}`)
      this.logger(Uint8Array.from(value))
      this.sendPortalNetworkResponse(
        src,

        message,
        Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)])
      )
    } else {
      this.logger(
        'Found value for requested content.  Larger than 1 packet.  uTP stream needed.' +
          Buffer.from(decodedContentMessage.contentKey).toString('hex') +
          value.slice(0, 10) +
          `...`
      )
      this.logger(`Generating Random Connection Id...`)
      const _id = randUint16()
      await this.uTP.handleNewHistoryNetworkRequest(
        [decodedContentMessage.contentKey],
        src.nodeId,
        _id,
        RequestCode.FOUNDCONTENT_WRITE,
        [value]
      )
      const idBuffer = Buffer.alloc(2)
      idBuffer.writeUInt16BE(_id, 0)
      const id = Uint8Array.from(idBuffer)
      this.logger(
        `Sending FOUND_CONTENT message with CONNECTION ID: ${_id}, waiting for uTP SYN Packet`
      )
      const payload = ContentMessageType.serialize({ selector: 0, value: id })
      this.sendPortalNetworkResponse(
        src,

        message,
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
  private handleUTP = async (
    src: INodeAddress,
    srcId: NodeId,
    msg: ITalkReqMessage,
    packetBuffer: Buffer
  ) => {
    await this.sendPortalNetworkResponse(src, msg, new Uint8Array())
    await this.uTP.handleUtpPacket(packetBuffer, srcId)
  }

  /**
   *
   * This method maintains the liveness of peers in the subprotocol routing tables.  If a PONG message is received from
   * an unknown peer for a given subprotocol, that peer is added to the corresponding subprotocol routing table.  If this
   * method is called with no `customPayload`, this indicates the peer corresponding to `srcId` should be removed from
   * the specified subprotocol routing table.
   * @param srcId nodeId of peer being updated in subprotocol routing table
   * @param protocolId subprotocol Id of routing table being updated
   * @param customPayload payload of the PING/PONG message being decoded
   */
  private updateSubprotocolRoutingTable = (
    srcId: NodeId | ENR,
    protocolId: SubprotocolIds,
    add = false,
    customPayload?: any
  ) => {
    const routingTable = this.routingTables.get(protocolId)
    if (!routingTable) {
      throw new Error(`No routing table found corresponding to ${protocolId}`)
    }
    const nodeId = typeof srcId === 'string' ? srcId : srcId.nodeId
    let enr = typeof srcId === 'string' ? routingTable.getValue(srcId) : srcId
    if (!add) {
      routingTable!.evictNode(nodeId)
      this.logger(
        `removed ${nodeId} from ${
          Object.keys(SubprotocolIds)[Object.values(SubprotocolIds).indexOf(protocolId)]
        } Routing Table`
      )
      this.emit('NodeRemoved', nodeId, protocolId)
      return
    }
    try {
      if (!routingTable!.getValue(nodeId)) {
        this.logger(
          `adding ${nodeId} to ${
            Object.keys(SubprotocolIds)[Object.values(SubprotocolIds).indexOf(protocolId)]
          } routing table`
        )
        if (!enr) {
          // If ENR wasn't passed in original call, look in discv5 routing table to see if known there
          enr = this.client.getKadValue(nodeId)
        }

        if (enr) {
          routingTable!.insertOrUpdate(enr!, EntryStatus.Connected)
          this.emit('NodeAdded', nodeId, protocolId)
        }
      }
      if (customPayload) {
        const decodedPayload = PingPongCustomDataType.deserialize(Uint8Array.from(customPayload))
        routingTable!.updateRadius(nodeId, decodedPayload.radius)
      }
    } catch (err) {
      this.logger(`Something went wrong`)
      this.logger(err)
    }
    return
  }

  public sendRendezvous = async (
    dstId: NodeId,
    rendezvousNode: NodeId,
    protocolId: SubprotocolIds
  ) => {
    this.logger(`Sending RENDEZVOUS message to ${shortId(rendezvousNode)} for ${shortId(dstId)}`)
    const time = Date.now()
    let res = await this.sendPortalNetworkMessage(
      rendezvousNode,
      Buffer.concat([
        Uint8Array.from([0]),
        Buffer.from(protocolId.slice(2), 'hex'),
        Buffer.from(dstId, 'hex'),
      ]),
      SubprotocolIds.Rendezvous
    )
    if (res.length > 0) {
      // Measure roundtrip to `dstId`
      const roundtrip = Date.now() - time
      const peer = ENR.decode(res)
      this.updateSubprotocolRoutingTable(peer, protocolId, true)
      setTimeout(() => this.sendPing(peer.nodeId, SubprotocolIds.HistoryNetwork), roundtrip / 2)
      this.logger(`Sending rendezvous DIRECT request to ${peer.nodeId}`)
      res = await this.sendPortalNetworkMessage(
        rendezvousNode,
        Buffer.concat([
          Uint8Array.from([1]),
          Buffer.from(protocolId.slice(2), 'hex'),
          Buffer.from(dstId, 'hex'),
        ]),
        SubprotocolIds.Rendezvous
      )
    }
    this.logger(res)
  }

  private handleRendezvous = async (src: INodeAddress, srcId: NodeId, message: ITalkReqMessage) => {
    const protocolId = ('0x' + message.request.slice(1, 3).toString('hex')) as SubprotocolIds
    const routingTable = this.routingTables.get(protocolId)

    if (!routingTable) {
      this.sendPortalNetworkResponse(src, message, Uint8Array.from([]))
      return
    }
    switch (message.request[0]) {
      case 0: {
        // Rendezvous FIND request - check to see if destination node is known to us
        const dstId = message.request.slice(3).toString('hex')
        this.logger(
          `Received Rendezvous FIND request for ${shortId(dstId)} on ${protocolId} network`
        )
        let enr = routingTable.getValue(dstId)
        if (!enr) {
          enr = this.client.getKadValue(dstId)
          if (!enr) {
            // destination node is unknown, send null response
            this.sendPortalNetworkResponse(src, message, Uint8Array.from([]))
            return
          }
        }
        // Destination node is known, send ENR to requestor
        this.logger(`found ENR for ${shortId(dstId)} - ${enr.encodeTxt()}`)
        const pingRes = await this.sendPing(enr.nodeId, protocolId)
        // Ping target node to verify it is reachable from rendezvous node
        if (!pingRes) {
          // If the target node isn't reachable, send null response
          this.sendPortalNetworkResponse(src, message, Uint8Array.from([]))
          return
        }
        const payload = enr.encode()
        this.sendPortalNetworkResponse(src, message, payload)
        break
      }
      case 1: {
        // SYNC request from requestor
        this.sendPortalNetworkResponse(src, message, Uint8Array.from([]))
        const dstId = message.request.slice(3).toString('hex')
        this.logger(
          `Received Rendezvous SYNC from requestor ${shortId(srcId)} for target ${shortId(dstId)}`
        )
        const srcEnr = routingTable.getValue(srcId)
        const payload = Buffer.concat([
          Uint8Array.from([2]),
          Buffer.from(protocolId.slice(2), 'hex'),
          srcEnr!.encode(),
        ])
        // Send SYNC request to target node
        this.logger(
          `Forwarding Rendezvous SYNC from requestor ${shortId(srcId)} to target ${shortId(dstId)}`
        )
        this.sendPortalNetworkMessage(dstId, payload, SubprotocolIds.Rendezvous)
        break
      }
      case 2: {
        // SYNC request from rendezvous node
        const enr = ENR.decode(message.request.slice(3))
        const protocolId = ('0x' + message.request.slice(1, 3).toString('hex')) as SubprotocolIds
        this.logger(
          `Received Rendezvous SYNC request from ${shortId(srcId)} for requester ${shortId(
            enr.nodeId
          )}`
        )
        // Add requestor to routing table
        this.updateSubprotocolRoutingTable(enr, protocolId, true)
        // Ping requestor
        this.logger(`Sending Rendezvous Ping to requestor ${shortId(enr.nodeId)}`)
        this.sendPing(enr.nodeId, protocolId)
      }
    }
  }

  /**
   *
   * @param dstId `NodeId` of message recipient
   * @param payload `Buffer` serialized payload of message
   * @param protocolId subprotocol ID of subprotocol message is being sent on
   * @returns response from `dstId` as `Buffer` or null `Buffer`
   */
  public sendPortalNetworkMessage = async (
    dstId: NodeId,
    payload: Buffer,
    protocolId: SubprotocolIds,
    utpMessage?: boolean
  ): Promise<Buffer> => {
    let enr = this.routingTables.get(protocolId)!.getValue(dstId)
    if (!enr) {
      enr = this.client.getKadValue(dstId)
      if (enr) {
        await this.updateSubprotocolRoutingTable(enr, protocolId, true)
      } else {
        this.logger(`${shortId(dstId)} not found in routing table`)
        return Buffer.from([0])
      }
    }
    const messageProtocol = utpMessage ? SubprotocolIds.UTPNetwork : protocolId
    try {
      this.metrics?.totalBytesSent.inc(payload.length)
      const res = await this.client.sendTalkReq(enr, payload, fromHexString(messageProtocol))
      return res
    } catch (err: any) {
      this.logger(`Error sending TALKREQ message: ${err}`)
      if (protocolId !== SubprotocolIds.UTPNetwork && payload[0] === 0) {
        // Evict node from routing table
        this.updateSubprotocolRoutingTable(dstId, protocolId, false)
      }
      return Buffer.from([0])
    }
  }

  private sendPortalNetworkResponse = async (
    src: INodeAddress,
    message: ITalkReqMessage,
    payload: Uint8Array
  ) => {
    this.client.sendTalkResp(src, message.id, payload)
  }

  /**
   * Pings each node in the specified routing table to check for liveness.  Uses the existing PING/PONG liveness logic to
   * evict nodes that do not respond
   */
  private livenessCheck = async (protocolId: SubprotocolIds) => {
    const routingTable = this.routingTables.get(protocolId)
    const peers: ENR[] = routingTable!.values()
    this.logger.extend('livenessCheck')(`Checking ${peers!.length} peers for liveness`)
    const deadPeers = (
      await Promise.all(
        peers.map((peer: ENR) => {
          return new Promise((resolve) => {
            const result = this.sendPing(peer.nodeId, protocolId)
            resolve(result)
          })
        })
      )
    ).filter((res) => !res)
    this.logger.extend('livenessCheck')(
      `Removed ${deadPeers.length} peers from ${protocolId} routing table`
    )
  }

  /**
   * Follows below algorithm to refresh a bucket in the History Network routing table
   * 1: Look at your routing table and select the first N buckets which are not full.
   * Any value of N < 10 is probably fine here.
   * 2: Randomly pick one of these buckets.  eighting this random selection to prefer
   * "larger" buckets can be done here to prioritize finding the easier to find nodes first.
   * 3: Randomly generate a NodeID that falls within this bucket.
   * Do the random lookup on this node-id.
   */
  private bucketRefresh = async () => {
    //await this.livenessCheck(SubprotocolIds.HistoryNetwork)
    const routingTable = this.routingTables.get(SubprotocolIds.HistoryNetwork)
    const peers = routingTable?.values().map((enr) => {
      return enr.encodeTxt()
    })
    await this.db.put('peers', JSON.stringify(peers))
    console.log('peers in db', peers?.length, JSON.parse(await this.db.get('peers')).length)
    const notFullBuckets = routingTable!.buckets
      .map((bucket, idx) => {
        return { bucket: bucket, distance: idx }
      })
      .filter((pair) => pair.distance > 239 && pair.bucket.size() < 16)
    if (notFullBuckets.length > 0) {
      const randomDistance = Math.trunc(Math.random() * 10)
      const distance = notFullBuckets[randomDistance].distance ?? notFullBuckets[0].distance
      this.logger(`Refreshing bucket at distance ${distance}`)
      const randomNodeAtDistance = generateRandomNodeIdAtDistance(this.client.enr.nodeId, distance)
      const lookup = new NodeLookup(this, randomNodeAtDistance, SubprotocolIds.HistoryNetwork)
      await lookup.startLookup()
    }
  }

  /**
   * Gossips recently added content to the nearest 5 nodes
   * @param blockHash hex prefixed blockhash of content to be gossipped
   * @param contentType type of content being gossipped
   */
  private gossipHistoryNetworkContent = async (
    blockHash: string,
    contentType: HistoryNetworkContentTypes
  ) => {
    const routingTable = this.routingTables.get(SubprotocolIds.HistoryNetwork)
    const contentId = getHistoryNetworkContentId(1, blockHash, contentType)
    const nearestPeers = routingTable!.nearest(contentId, 5)
    const encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: contentType,
      value: { chainId: 1, blockHash: fromHexString(blockHash) },
    })

    nearestPeers.forEach((peer) => {
      if (
        !routingTable!.contentKeyKnownToPeer(peer.nodeId, toHexString(encodedKey)) &&
        distance(peer.nodeId, contentId) < routingTable!.getRadius(peer.nodeId)!
        // If peer hasn't already been OFFERed this contentKey and the content is within the peer's advertised radius, OFFER
      ) {
        this.sendOffer(peer.nodeId, [encodedKey], SubprotocolIds.HistoryNetwork)
      }
    })
  }
}
