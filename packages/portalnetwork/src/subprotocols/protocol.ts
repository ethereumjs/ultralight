import { distance, ENR, EntryStatus, SignableENR } from '@chainsafe/discv5'
import { ITalkReqMessage } from '@chainsafe/discv5/message'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo.js'
import { toHexString, BitArray } from '@chainsafe/ssz'
import { Union } from '@chainsafe/ssz/lib/interface.js'
import { Debugger } from 'debug'
import {
  randUint16,
  MAX_PACKET_SIZE,
  arrayByteLength,
  PortalNetworkMetrics,
  ProtocolId,
  PortalNetworkRoutingTable,
  shortId,
  serializedContentKeyToContentId,
  generateRandomNodeIdAtDistance,
  AcceptMessage,
  ContentMessageType,
  FindContentMessage,
  FindNodesMessage,
  MessageCodes,
  NodesMessage,
  OfferMessage,
  PingMessage,
  PingPongCustomDataType,
  PongMessage,
  PortalWireMessageType,
  RequestCode,
  NodeLookup,
  StateNetworkRoutingTable,
  encodeWithVariantPrefix,
  INewRequest,
  ContentRequest,
  PortalNetwork,
} from '../index.js'
import { FoundContent } from '../wire/types.js'
import { EventEmitter } from 'events'
import { bytesToInt, concatBytes, hexToBytes } from '@ethereumjs/util'

export abstract class BaseProtocol extends EventEmitter {
  public routingTable: PortalNetworkRoutingTable | StateNetworkRoutingTable
  public metrics: PortalNetworkMetrics | undefined
  private nodeRadius: bigint
  private checkIndex: number
  abstract logger: Debugger
  abstract protocolId: ProtocolId
  abstract protocolName: string
  public enr: SignableENR
  handleNewRequest: (request: INewRequest) => Promise<ContentRequest>
  sendMessage: (
    enr: ENR | string,
    payload: Uint8Array,
    protocolId: ProtocolId,
    utpMessage?: boolean,
  ) => Promise<Uint8Array>
  sendResponse: (src: INodeAddress, requestId: bigint, payload: Uint8Array) => Promise<void>
  findEnr: (nodeId: string) => ENR | undefined
  put: (protocol: ProtocolId, contentKey: string, content: string) => void
  get: (protocol: ProtocolId, contentKey: string) => Promise<string>
  _prune: (protocol: ProtocolId, radius: bigint) => Promise<void>
  portal: PortalNetwork
  constructor(client: PortalNetwork, radius?: bigint) {
    super()
    this.sendMessage = client.sendPortalNetworkMessage.bind(client)
    this.sendResponse = client.sendPortalNetworkResponse.bind(client)
    this.findEnr = client.discv5.findEnr.bind(client.discv5)
    this.put = client.db.put.bind(client.db)
    this.get = client.db.get.bind(client.db)
    this.handleNewRequest = client.uTP.handleNewRequest.bind(client.uTP)
    this._prune = client.db.prune.bind(client.db)
    this.enr = client.discv5.enr
    this.checkIndex = 0
    this.nodeRadius = radius ?? 2n ** 256n - 1n
    this.routingTable = new PortalNetworkRoutingTable(this.enr.nodeId)
    this.portal = client
    this.metrics = client.metrics
    if (this.metrics) {
      this.metrics.knownHistoryNodes.collect = () => {
        this.metrics?.knownHistoryNodes.set(this.routingTable.size)
      }
    }
  }

  abstract store(contentType: any, hashKey: string, value: Uint8Array): Promise<void>

  public handle(message: ITalkReqMessage, src: INodeAddress) {
    const id = message.id
    const protocol = message.protocol
    const request = message.request
    const deserialized = PortalWireMessageType.deserialize(request)
    const decoded = deserialized.value
    const messageType = deserialized.selector
    const srcEnr = this.routingTable.getWithPending(src.nodeId)
    if (srcEnr === undefined) {
      this.logger(`Received TALKREQ from node not known to support ${this.protocolName}`)
      const enr = this.findEnr(src.nodeId)
      enr !== undefined && this.updateRoutingTable(enr)
    }
    this.logger.extend(MessageCodes[messageType])(
      `Received from ${shortId(
        srcEnr !== undefined ? srcEnr.value : src.nodeId,
        this.routingTable,
      )}`,
    )
    switch (messageType) {
      case MessageCodes.PING:
        this.handlePing(src, id, decoded as PingMessage)
        break
      case MessageCodes.PONG:
        this.logger(`PONG message not expected in TALKREQ`)
        break
      case MessageCodes.FINDNODES:
        this.metrics?.findNodesMessagesReceived.inc()
        this.handleFindNodes(src, id, decoded as FindNodesMessage)
        break
      case MessageCodes.FINDCONTENT:
        this.metrics?.findContentMessagesReceived.inc()
        this.handleFindContent(src, id, protocol, decoded as FindContentMessage)
        break
      case MessageCodes.OFFER:
        this.metrics?.offerMessagesReceived.inc()
        this.handleOffer(src, id, decoded as OfferMessage)
        break
      case MessageCodes.NODES:
      case MessageCodes.CONTENT:
      case MessageCodes.ACCEPT:
      default:
        this.logger(`${messageType} message not expected in TALKREQ`)
    }
  }
  /**
   * Sends a Portal Network Wire Protocol PING message to a specified node
   * @param dstId the nodeId of the peer to send a ping to
   * @param payload custom payload to be sent in PING message
   * @param protocolId subprotocol ID
   * @returns the PING payload specified by the subprotocol or undefined
   */
  public sendPing = async (enr: ENR | string) => {
    if (!(enr instanceof ENR)) {
      enr = ENR.decodeTxt(enr)
    }
    if (enr.nodeId === this.portal.discv5.enr.nodeId) {
      // Don't ping ourselves
      return undefined
    }
    // 3000ms tolerance for ping timeout
    if (!enr.nodeId) {
      this.logger(`Invalid ENR provided. PING aborted`)
      return
    }
    const timeout = setTimeout(() => {
      return undefined
    }, 3000)
    try {
      const pingMsg = PortalWireMessageType.serialize({
        selector: MessageCodes.PING,
        value: {
          enrSeq: this.enr.seq,
          customPayload: PingPongCustomDataType.serialize({ radius: BigInt(this.nodeRadius) }),
        },
      })
      this.logger.extend(`PING`)(`Sent to ${shortId(enr)}`)
      const res = await this.sendMessage(enr, pingMsg, this.protocolId)
      if (bytesToInt(res.subarray(0, 1)) === MessageCodes.PONG) {
        this.logger.extend('PONG')(`Received from ${shortId(enr)}`)
        const decoded = PortalWireMessageType.deserialize(res)
        const pongMessage = decoded.value as PongMessage
        // Received a PONG message so node is reachable, add to routing table
        this.updateRoutingTable(enr, pongMessage.customPayload)
        clearTimeout(timeout)
        return pongMessage
      } else {
        clearTimeout(timeout)
        this.routingTable.evictNode(enr.nodeId)
      }
    } catch (err: any) {
      this.logger(`Error during PING request: ${err.toString()}`)
      enr.nodeId && this.routingTable.evictNode(enr.nodeId)
      clearTimeout(timeout)
      return
    }
  }

  handlePing = async (src: INodeAddress, id: bigint, pingMessage: PingMessage) => {
    if (!this.routingTable.getWithPending(src.nodeId)?.value) {
      // Check to see if node is already in corresponding network routing table and add if not
      const enr = this.findEnr(src.nodeId)
      if (enr !== undefined) {
        this.updateRoutingTable(enr, pingMessage.customPayload)
      }
    } else {
      const radius = PingPongCustomDataType.deserialize(pingMessage.customPayload).radius
      this.routingTable.updateRadius(src.nodeId, radius)
    }
    this.sendPong(src, id)
  }

  sendPong = async (src: INodeAddress, requestId: bigint) => {
    const payload = {
      enrSeq: this.enr.seq,
      customPayload: PingPongCustomDataType.serialize({ radius: this.nodeRadius }),
    }
    const pongMsg = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: payload,
    })
    this.logger.extend('PONG')(`Sent to ${shortId(src.nodeId, this.routingTable)}`)
    this.sendResponse(src, requestId, pongMsg)
  }

  /**
   *
   * Sends a Portal Network FINDNODES request to a peer requesting other node ENRs
   * @param dstId node id or enr of peer
   * @param distances distances as defined by subprotocol for node ENRs being requested
   * @param protocolId subprotocol id for message being
   * @returns a {@link `NodesMessage`} or undefined
   */
  public sendFindNodes = async (dstId: string, distances: number[]) => {
    this.metrics?.findNodesMessagesSent.inc()
    const findNodesMsg: FindNodesMessage = { distances: distances }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDNODES,
      value: findNodesMsg,
    })
    let enr
    try {
      enr = dstId.startsWith('enr')
        ? ENR.decodeTxt(dstId)
        : this.routingTable.getWithPending(dstId)
        ? this.routingTable.getWithPending(dstId)!.value
        : this.routingTable.getValue(dstId)
    } catch (err: any) {
      // TODO: Find source of "cannot read properties of undefined (reading 'getWithPending')" error
    }
    if (!enr) {
      return
    }
    const res = await this.sendMessage(enr, payload, this.protocolId)
    if (bytesToInt(res.slice(0, 1)) === MessageCodes.NODES) {
      this.metrics?.nodesMessagesReceived.inc()
      const decoded = PortalWireMessageType.deserialize(res).value as NodesMessage
      const enrs = decoded.enrs ?? []
      try {
        if (enrs.length > 0) {
          const notIgnored = enrs.filter((e) => !this.routingTable.isIgnored(ENR.decode(e).nodeId))
          const unknown = this.routingTable
            ? notIgnored.filter(
                (e) => !this.routingTable.getWithPending(ENR.decode(e).nodeId)?.value,
              )
            : notIgnored
          // Ping node if not currently in subprotocol routing table
          for (const e of unknown) {
            const decodedEnr = ENR.decode(e)
            const ping = await this.sendPing(decodedEnr)
            if (ping === undefined) {
              this.logger(`New connection failed with:  ${shortId(decodedEnr)}`)
              this.routingTable.evictNode(decodedEnr.nodeId)
            } else {
              this.logger(`New connection with:  ${shortId(decodedEnr)}`)
            }
          }
          this.logger.extend(`NODES`)(
            `Received ${enrs.length} ENRs from ${shortId(enr)} with ${
              enrs.length - notIgnored.length
            } ignored PeerIds and ${unknown.length} unknown.`,
          )
        }
      } catch (err: any) {
        this.logger(`Error processing NODES message: ${err.toString()}`)
      }

      return decoded
    }
  }

  private handleFindNodes = async (
    src: INodeAddress,
    requestId: bigint,
    payload: FindNodesMessage,
  ) => {
    if (payload.distances.length > 0) {
      const nodesPayload: NodesMessage = {
        total: 0,
        enrs: [],
      }

      for (const distance of payload.distances) {
        this.logger.extend(`FINDNODES`)(
          `Gathering ENRs at distance ${distance} from ${shortId(src.nodeId, this.routingTable)}`,
        )
        if (distance === 0) {
          // Send the client's ENR if a node at distance 0 is requested
          nodesPayload.total++
          nodesPayload.enrs.push(this.enr.toENR().encode())
        } else {
          for (const enr of this.routingTable.valuesOfDistance(distance)) {
            // Exclude ENR from response if it matches the requesting node
            if (enr.nodeId === src.nodeId) continue
            // Break from loop if total size of NODES payload would exceed 1200 bytes
            // TODO: Decide what to do about case where we have more ENRs we could send

            if (arrayByteLength(nodesPayload.enrs) + enr.encode().length < 1200) {
              nodesPayload.total++
              nodesPayload.enrs.push(enr.encode())
            }
          }
        }
      }

      const encodedPayload = PortalWireMessageType.serialize({
        selector: MessageCodes.NODES,
        value: nodesPayload,
      })
      if (nodesPayload.enrs.length > 0) {
        this.logger.extend(`NODES`)(
          `Sending`,
          nodesPayload.enrs.length.toString(),
          `ENRs to `,
          shortId(src.nodeId, this.routingTable),
        )
      }
      this.sendResponse(src, requestId, encodedPayload)
      this.metrics?.nodesMessagesSent.inc()
    } else {
      this.sendResponse(src, requestId, new Uint8Array())
    }
  }

  /**
   * Offers content corresponding to `contentKeys` to peer corresponding to `dstId`
   * @param dstId node ID of a peer
   * @param contentKeys content keys being offered as specified by the subprotocol
   * @param protocolId network ID of subprotocol being used
   */
  public sendOffer = async (dstId: string, contentKeys: Uint8Array[]) => {
    if (contentKeys.length > 0) {
      this.metrics?.offerMessagesSent.inc()
      const offerMsg: OfferMessage = {
        contentKeys,
      }
      const payload = PortalWireMessageType.serialize({
        selector: MessageCodes.OFFER,
        value: offerMsg,
      })
      const enr = this.routingTable.getWithPending(dstId)?.value
      if (!enr) {
        this.logger(`No ENR found for ${shortId(dstId)}. OFFER aborted.`)
        return
      }
      this.logger.extend(`OFFER`)(
        `Sent to ${shortId(enr)} with ${contentKeys.length} pieces of content`,
      )
      const res = await this.sendMessage(enr, payload, this.protocolId)
      this.logger.extend(`OFFER`)(`Response from ${shortId(enr)}`)
      if (res.length > 0) {
        try {
          const decoded = PortalWireMessageType.deserialize(res)
          if (decoded.selector === MessageCodes.ACCEPT) {
            this.metrics?.acceptMessagesReceived.inc()
            const msg = decoded.value as AcceptMessage
            const id = new DataView(msg.connectionId.buffer).getUint16(0, false)
            // Initiate uTP streams with serving of requested content
            const requestedKeys: Uint8Array[] = contentKeys.filter(
              (n, idx) => msg.contentKeys.get(idx) === true,
            )
            if (requestedKeys.length === 0) {
              // Don't start uTP stream if no content ACCEPTed
              this.logger.extend('ACCEPT')(`No content ACCEPTed by ${shortId(enr)}`)
              return []
            }
            this.logger.extend(`OFFER`)(`ACCEPT message received with uTP id: ${id}`)

            const requestedData: Uint8Array[] = []
            for await (const key of requestedKeys) {
              let value = Uint8Array.from([])
              try {
                value = hexToBytes(await this.get(this.protocolId, toHexString(key)))
                requestedData.push(value)
              } catch (err: any) {
                this.logger(`Error retrieving content -- ${err.toString()}`)
                requestedData.push(value)
              }
            }

            const contents = encodeWithVariantPrefix(requestedData)
            await this.handleNewRequest({
              protocolId: this.protocolId,
              contentKeys: requestedKeys,
              peerId: dstId,
              connectionId: id,
              requestCode: RequestCode.OFFER_WRITE,
              contents: [contents],
            })

            return msg.contentKeys
          }
        } catch (err: any) {
          this.logger(`Error sending to ${shortId(enr)} - ${err.message}`)
        }
      }
    }
  }

  protected handleOffer = async (src: INodeAddress, requestId: bigint, msg: OfferMessage) => {
    this.logger.extend('OFFER')(
      `Received from ${shortId(src.nodeId, this.routingTable)} with ${
        msg.contentKeys.length
      } pieces of content.`,
    )
    try {
      if (msg.contentKeys.length > 0) {
        let offerAccepted = false
        try {
          const contentIds: boolean[] = Array(msg.contentKeys.length).fill(false)

          for (let x = 0; x < msg.contentKeys.length; x++) {
            try {
              await this.get(this.protocolId, toHexString(msg.contentKeys[x]))
              this.logger.extend('OFFER')(`Already have this content ${msg.contentKeys[x]}`)
            } catch (err) {
              offerAccepted = true
              contentIds[x] = true
              this.logger.extend('OFFER')(
                `Found some interesting content from ${shortId(src.nodeId, this.routingTable)}`,
              )
            }
          }
          if (offerAccepted) {
            this.logger(`Accepting an OFFER`)
            const desiredKeys = msg.contentKeys.filter((k, i) => contentIds[i] === true)
            this.logger(toHexString(msg.contentKeys[0]))
            this.sendAccept(src, requestId, contentIds, desiredKeys)
          } else {
            this.logger(`Declining an OFFER since no interesting content`)
            this.sendResponse(src, requestId, new Uint8Array())
          }
        } catch {
          this.logger(`Something went wrong handling offer message`)
          // Send empty response if something goes wrong parsing content keys
          this.sendResponse(src, requestId, new Uint8Array())
        }
        if (!offerAccepted) {
          this.logger('We already have all this content')
          this.sendResponse(src, requestId, new Uint8Array())
        }
      } else {
        this.logger(`Offer Message Has No Content`)
        // Send empty response if something goes wrong parsing content keys
        this.sendResponse(src, requestId, new Uint8Array())
      }
    } catch {
      this.logger(`Error Processing OFFER msg`)
    }
  }

  protected sendAccept = async (
    src: INodeAddress,
    requestId: bigint,
    desiredContentAccepts: boolean[],
    desiredContentKeys: Uint8Array[],
  ) => {
    const id = randUint16()
    this.logger.extend('ACCEPT')(
      `Accepting: ${desiredContentKeys.length} pieces of content.  connectionId: ${id}`,
    )

    this.metrics?.acceptMessagesSent.inc()
    await this.handleNewRequest({
      protocolId: this.protocolId,
      contentKeys: desiredContentKeys,
      peerId: src.nodeId,
      connectionId: id,
      requestCode: RequestCode.ACCEPT_READ,
      contents: [],
    })
    const idBuffer = new Uint8Array(2)
    new DataView(idBuffer.buffer).setUint16(0, id, false)

    const payload: AcceptMessage = {
      connectionId: idBuffer,
      contentKeys: BitArray.fromBoolArray(desiredContentAccepts),
    }
    const encodedPayload = PortalWireMessageType.serialize({
      selector: MessageCodes.ACCEPT,
      value: payload,
    })
    await this.sendResponse(src, requestId, encodedPayload)
    this.logger.extend('ACCEPT')(
      `Sent to ${shortId(src.nodeId, this.routingTable)} for ${
        desiredContentKeys.length
      } pieces of content.  connectionId: ${id}`,
    )
  }

  protected handleFindContent = async (
    src: INodeAddress,
    requestId: bigint,
    protocol: Uint8Array,
    decodedContentMessage: FindContentMessage,
  ) => {
    this.metrics?.contentMessagesSent.inc()

    this.logger(
      `Received FindContent request for contentKey: ${toHexString(
        decodedContentMessage.contentKey,
      )}`,
    )

    const lookupKey = serializedContentKeyToContentId(decodedContentMessage.contentKey)
    const value = await this.findContentLocally(decodedContentMessage.contentKey)
    if (!value || value.length === 0) {
      // Discv5 calls for maximum of 16 nodes per NODES message
      const ENRs = this.routingTable.nearest(lookupKey, 16)

      const encodedEnrs = ENRs.map((enr) => {
        // Only include ENR if not the ENR of the requesting node and the ENR is closer to the
        // contentId than this node
        return enr.nodeId !== src.nodeId &&
          distance(enr.nodeId, lookupKey) < distance(this.enr.nodeId, lookupKey)
          ? enr.encode()
          : undefined
      }).filter((enr) => enr !== undefined)
      if (encodedEnrs.length > 0) {
        this.logger(`Found ${encodedEnrs.length} closer to content than us`)
        // TODO: Add capability to send multiple TALKRESP messages if # ENRs exceeds packet size
        while (encodedEnrs.length > 0 && arrayByteLength(encodedEnrs) > 1200) {
          // Remove ENRs until total ENRs less than 1200 bytes
          encodedEnrs.pop()
        }
        const payload = ContentMessageType.serialize({
          selector: FoundContent.ENRS,
          value: encodedEnrs as Uint8Array[],
        })
        this.sendResponse(
          src,
          requestId,
          concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
        )
      } else {
        const payload = ContentMessageType.serialize({
          selector: FoundContent.ENRS,
          value: [],
        })
        this.logger(`Found no ENRs closer to content than us`)
        this.sendResponse(
          src,
          requestId,
          concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
        )
      }
    } else if (value && value.length < MAX_PACKET_SIZE) {
      this.logger(
        'Found value for requested content ' +
          toHexString(decodedContentMessage.contentKey) +
          ' ' +
          toHexString(value.slice(0, 10)) +
          `...`,
      )
      const payload = ContentMessageType.serialize({
        selector: 1,
        value: value,
      })
      this.logger.extend('CONTENT')(`Sending requested content to ${src.nodeId}`)
      this.sendResponse(
        src,
        requestId,
        concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
      )
    } else {
      this.logger.extend('FOUNDCONTENT')(
        'Found value for requested content.  Larger than 1 packet.  uTP stream needed.',
      )
      const _id = randUint16()
      await this.handleNewRequest({
        protocolId: this.protocolId,
        contentKeys: [decodedContentMessage.contentKey],
        peerId: src.nodeId,
        connectionId: _id,
        requestCode: RequestCode.FOUNDCONTENT_WRITE,
        contents: [value],
      })

      const id = new Uint8Array(2)
      new DataView(id.buffer).setUint16(0, _id, false)
      this.logger.extend('FOUNDCONTENT')(`Sent message with CONNECTION ID: ${_id}.`)
      const payload = ContentMessageType.serialize({ selector: FoundContent.UTP, value: id })
      this.sendResponse(
        src,
        requestId,
        concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
      )
    }
  }

  /**
   *
   * This method maintains the liveness of peers in the subprotocol routing tables.
   * @param srcId nodeId of peer being updated in subprotocol routing table
   * @param protocolId subprotocol Id of routing table being updated
   * @param customPayload payload of the PING/PONG message being decoded
   */
  private updateRoutingTable = (enr: ENR, customPayload?: any) => {
    try {
      const nodeId = enr.nodeId
      // Only add node to the routing table if we have an ENR
      this.routingTable.getWithPending(enr.nodeId)?.value === undefined &&
        this.logger(`adding ${nodeId} to ${this.protocolName} routing table`)
      this.routingTable.insertOrUpdate(enr, EntryStatus.Connected)
      if (customPayload) {
        const decodedPayload = PingPongCustomDataType.deserialize(Uint8Array.from(customPayload))
        this.routingTable.updateRadius(nodeId, decodedPayload.radius)
      }
      this.portal.emit('NodeAdded', enr.nodeId, this.protocolId)
    } catch (err) {
      this.logger(`Something went wrong: ${(err as any).message}`)
      try {
        this.routingTable.getWithPending(enr as any)?.value === undefined &&
          this.logger(`adding ${enr as any} to ${this.protocolName} routing table`)
        this.routingTable.insertOrUpdate(enr, EntryStatus.Connected)
        if (customPayload) {
          const decodedPayload = PingPongCustomDataType.deserialize(Uint8Array.from(customPayload))
          this.routingTable.updateRadius(enr.nodeId, decodedPayload.radius)
        }
        this.portal.emit('NodeAdded', enr.nodeId, this.protocolId)
      } catch (e) {
        this.logger(`Something went wrong : ${(e as any).message}`)
      }
    }
    return
  }

  abstract findContentLocally: (contentKey: Uint8Array) => Promise<Uint8Array | undefined>

  abstract sendFindContent?: (
    dstId: string,
    key: Uint8Array,
  ) => Promise<Union<Uint8Array | Uint8Array[]> | undefined>

  /**
   * Pings each node in a 20% sample of the routing table.
   * Uses the existing PING/PONG liveness logic to evict nodes that do not respond.
   */
  private livenessCheck = async () => {
    let peers: ENR[] = this.routingTable.values()
    const sample = Math.ceil(peers.length / 5)
    peers = peers.slice(this.checkIndex, this.checkIndex + sample)
    this.checkIndex = (this.checkIndex + sample) % peers.length
    const flagged = []
    for (const peer of peers) {
      const res = await this.sendPing(peer)
      if (res === undefined) {
        flagged.push(peer.nodeId)
      }
    }
    if (flagged.length > 0) {
      this.logger.extend('livenessCheck')(`Flagged ${flagged.length} peers from routing table`)
    } else if (peers.length > 0) {
      this.logger.extend('livenessCheck')(`${peers.length} peers passed liveness check`)
    }
    this.routingTable.clearIgnored()
  }

  /**
   * Follows below algorithm to refresh a bucket in the routing table
   * 1: Look at your routing table and select all buckets at distance greater than 239 that are not full.
   * 2: Select a number of buckets to refresh using this logic (48+ nodes known, refresh 1 bucket, 24+ nodes known,
   * refresh half of not full buckets, <25 nodes known, refresh all not empty buckets
   * 3: Randomly generate a NodeID that falls within each bucket to be refreshed.
   * Do the random lookup on this node-id.
   */
  public bucketRefresh = async () => {
    await this.livenessCheck()
    const notFullBuckets = this.routingTable.buckets
      .map((bucket, idx) => {
        return { bucket: bucket, distance: idx }
      })
      .filter((pair) => pair.bucket.size() < 16)
      .reverse()
      .slice(0, 4)
    const size = this.routingTable.size
    let bucketsToRefresh
    if (size > 48) {
      // Only refresh one not full bucket if table contains equivalent of 3+ full buckets
      const idx = Math.floor(Math.random() * notFullBuckets.length)
      bucketsToRefresh = [notFullBuckets[idx]]
    } else if (size > 24) {
      // Refresh half of notFullBuckets if routing table contains equivalent of 1.5+ full buckets
      bucketsToRefresh = notFullBuckets.filter((_, idx) => idx % 2 === 0)
      // Refresh all not full buckets if routing table contains less than 25 nodes in it
    } else bucketsToRefresh = notFullBuckets
    for (const bucket of bucketsToRefresh) {
      const distance = bucket.distance
      const randomNodeAtDistance = generateRandomNodeIdAtDistance(this.enr.nodeId, distance)
      const lookup = new NodeLookup(this, randomNodeAtDistance)
      await lookup.startLookup()
    }
  }

  /**
   * Adds a bootnode which triggers a `findNodes` request to the Bootnode to populate the routing table
   * @param bootnode `string` encoded ENR of a bootnode
   * @param protocolId network ID of the subprotocol routing table to add the bootnode to
   */
  public addBootNode = async (bootnode: string) => {
    const enr = ENR.decodeTxt(bootnode)
    if (enr.nodeId === this.enr.nodeId) {
      // Disregard attempts to add oneself as a bootnode
      return
    }
    await this.sendPing(enr)
    for (let x = 239; x < 256; x++) {
      // Ask for nodes in all log2distances 239 - 256
      if (this.routingTable.valuesOfDistance(x).length === 0) {
        this.sendFindNodes(enr.nodeId, [x])
      }
    }
  }

  public async prune(radius: bigint) {
    this._prune(this.protocolId, radius)
    this.nodeRadius = radius
  }

  // Gossip (OFFER) content to any interested peers.
  // Returns the number of peers that accepted the gossip.
  public async gossipContent(contentKey: Uint8Array, content: Uint8Array): Promise<number> {
    const peers = this.routingTable
      .values()
      .filter((e) => !this.routingTable.contentKeyKnownToPeer(e.nodeId, toHexString(contentKey)))
    const offerMsg: OfferMessage = {
      contentKeys: [contentKey],
    }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.OFFER,
      value: offerMsg,
    })
    let accepted = 0
    for (const peer of peers) {
      const res = await this.sendMessage(peer, payload, this.protocolId)
      if (res.length > 0) {
        try {
          const decoded = PortalWireMessageType.deserialize(res)
          if (decoded.selector === MessageCodes.ACCEPT) {
            const msg = decoded.value as AcceptMessage
            if (msg.contentKeys.get(0) === true) {
              accepted++
              const id = new DataView(msg.connectionId.buffer).getUint16(0, false)
              this.handleNewRequest({
                protocolId: this.protocolId,
                contentKeys: [contentKey],
                peerId: peer.nodeId,
                connectionId: id,
                requestCode: RequestCode.OFFER_WRITE,
                contents: [encodeWithVariantPrefix([content])],
              })
            }
          }
        } catch {}
      }
    }
    return accepted
  }

  public async retrieve(contentKey: string): Promise<string | undefined> {
    try {
      const content = await this.get(this.protocolId, contentKey)
      return content
    } catch {
      this.logger('Error retrieving content from DB')
    }
  }
}
