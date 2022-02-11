import {
  Discv5,
  distance,
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
import {
  addRLPSerializedBlock,
  generateRandomNodeIdAtDistance,
  reassembleBlock,
  shortId,
} from '../util'
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
import rlp from 'rlp'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo'
import {
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
} from '../historySubnetwork/types'
import { Block, BlockHeader } from '@ethereumjs/block'
import { getContentId, getContentIdFromSerializedKey } from '../historySubnetwork'
import { Lookup } from '../wire'
const level = require('level-mem')

const log = debug('portalnetwork')

const MAX_PACKET_SIZE = 1280

export class PortalNetwork extends (EventEmitter as { new (): PortalNetworkEventEmitter }) {
  client: Discv5
  stateNetworkRoutingTable: StateNetworkRoutingTable
  historyNetworkRoutingTable: PortalNetworkRoutingTable
  uTP: UtpProtocol
  nodeRadius: number
  db: LevelUp
  private refreshListener?: ReturnType<typeof setInterval>

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
  }

  /**
   * Starts the portal network client
   */
  public start = async () => {
    // Hardcoded data for testing - block 1 from mainnet
    const block1Rlp =
      '0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4'
    const block1Hash = '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
    const block1 = BlockHeader.fromRLPSerializedHeader(Buffer.from(fromHexString(block1Rlp)))
    this.addContentToHistory(
      1,
      HistoryNetworkContentTypes.BlockHeader,
      block1Hash,
      Uint8Array.from(block1.serialize())
    )
    const block304583Rlp =
      '0xf90a4ff90218a0be8361d665ca0c7921df4419522c1319c3012d4adbea5c6229c84ec86fbf52f2a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a01aef82504fc10469532521faa4426ee8c5331ac9c0ef1af7bcab967f5aa6e1a1a092ed465e40f9ee2e3a9e9f4f8ecb1f11923bb0376d976312d6c40576439be150a0a5cf019118b22b15a360e97c35c75a7dbc871318c4f3ba462837b186653c2a4db90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605ddae9bb8d28304a5c7832ff7688306050e845609aaad98d783010103844765746887676f312e342e32856c696e7578a031538fbc9699fc6b359fc26ea2d94bb2556d7d999b101650c78c88f71d61133888b78f1aed8ad0d52af90830f904ad8201d5850ce1a0813e832f4d60945be6129ce8f523753131eb11c6f719f5b72e0e1180b90444d810612b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000740000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007400000000000000000000000000000000000000000000000000000000000000741ba0fda17baa8772b9257525c04787d781376fdbc025ae0d0393b1bd8e7b5540b332a01f4d64f42b3aa203b9178d2deb19aa6d0dad24e48c8edf848d226952ed2aef48f86e82a7fe850ba43b74008261a89429fb2ca00f91f16b065ef332ac7948d4cc16a0658802a85985c3fa0c80801ca064fe9b4332507cb713828e738fb3a4a4fc373727185ea81dc6e95957c06f9214a0011966a5748baa542b32cbf3fb3fc46512d0f0704e53ed63a4f86e47a0a8db51f86e82a7ff850ba43b74008261a894715831b632c51081b507af551f534a50fcbb3690888c387839b61ea000801ca0d4f91a0dda2327f1fd4c5741c291979fc5cdb31f6ed8777465150eb5e0f19c62a079d14b7cae5864f2d6ee2e733e4c5c8a48522c7dbd79e79d2a7d41d159c046e8f86e82a800850ba43b74008261a8943a4cc071e426cffba54c267391e401e820a5e472887f554460d4725000801ba0cb0c573e605053d01b800b30388023357d953c9af2cbebe36a6b2b033936fe7fa010d7e92941b4e4760e8b3b2d4f40e495766ad7ffffa5bc62593bd3f6765ca759f86e82a801850ba43b74008261a894d5fda805ff27942da5b6b27884255bf7bfdc6f4f881a2d10c27aa21600801ba0a4a02d9fc9178bc7a42b504649b88624a40085621275f1351b68e939b238e316a0376c96e16bfe6a4c35ecfbccf0b0deaa456db7a81e29d3c4f9390248c49485f6f86e82a802850ba43b74008261a894b48dbbdc7118253be140f43098e2a0bec43fcbf988d7a97439797f8000801ba05328ac567dea32b748c82311e9d002fa13e17a39072db38797762b9ea633139aa0531c49ae4f6a508b2c900a44f386d85d75682af45201b977abd6e3630535ed21f86e82a803850ba43b74008261a894bc0f4f3338f099e578819a8d87976df731b6ee7e881d4f6e1cba82d700801ba08bdd1820eea89f2c3176de03b7be89df5d5b636e082bfc399dfbac7a8d1d8f71a05a05466e3ad65ca9cf87cbbb517d3869623f82c6e02419f081da5101e145225ff86e82a804850ba43b74008261a8941cc77ed71531833bac1ea0e757cd150dcd297920881755213637cf0c00801ba042e7a7352afbd48b13039b40eafa8e0783a1f671f6c969bd509924c12de89e3aa07a88806b8729125c6bb2ba2e552dff0af9c2d178df9201c80923cf13997b163df86e82a805850ba43b74008261a89451033f1a1a59cb6a1bf6ca2087a53bd202ac1c838838221051d9b89c00801ca0328e9a7e2cf52b9a85d34cfb9545b307cb136da2c2e6f3ec4b6a385020b3b055a05427804ddf8c34fdca86dde482b45495d84b63ad9190a98b01332d0528667243c0'
    const block304583Hash = '0xca6063e4d9b37c2777233b723d9b08cf248e34a5ebf7f5720d59323a93eec14f'
    await addRLPSerializedBlock(block304583Rlp, block304583Hash, this)

    await this.client.start()
    // Start kbucket refresh on 30 second interval
    this.refreshListener = setInterval(() => this.bucketRefresh(), 30000)
  }

  /**
   * Stops the portal network client and cleans up listeners
   */
  public stop = async () => {
    await this.client.stop()
    await this.removeAllListeners()
    await this.db.removeAllListeners()
    await this.db.close()
    this.refreshListener && clearInterval(this.refreshListener)
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

  sendPing = async (nodeId: string, networkId: SubNetworkIds) => {
    let dstId
    if (nodeId.startsWith('enr')) {
      const enr = ENR.decodeTxt(nodeId)
      this.historyNetworkRoutingTable.insertOrUpdate(enr, EntryStatus.Connected)
      dstId = enr.nodeId
    } else {
      dstId = nodeId
    }
    const payload = PingPongCustomDataType.serialize({ radius: BigInt(this.nodeRadius) })
    const pingMsg = PortalWireMessageType.serialize({
      selector: MessageCodes.PING,
      value: {
        enrSeq: this.client.enr.seq,
        customPayload: payload,
      },
    })
    try {
      log(`Sending PING to ${shortId(dstId)} for ${SubNetworkIds.HistoryNetwork} subnetwork`)
      const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(pingMsg), networkId)
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.PONG) {
        log(`Received PONG from ${shortId(dstId)}`)
        const decoded = PortalWireMessageType.deserialize(res)
        const pongMessage = decoded.value as PongMessage
        this.updateSubnetworkRoutingTable(dstId, networkId, pongMessage.customPayload)
        return decoded.value as PongMessage
      }
    } catch (err: any) {
      log(`Error during PING request to ${shortId(dstId)}: ${err.toString()}`)
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
      log(`Sending FINDNODES to ${shortId(dstId)} for ${networkId} subnetwork`)
      const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.NODES) {
        log(`Received NODES from ${shortId(dstId)}`)
        const decoded = PortalWireMessageType.deserialize(res).value as NodesMessage
        if (decoded) {
          log(`Received ${decoded.total} ENRs from ${shortId(dstId)}`)
          decoded.enrs.forEach((enr) => {
            const decodedEnr = ENR.decode(Buffer.from(enr))
            log(decodedEnr.nodeId)
            // Add ENR to Discv5 routing table since we can't send messages to a node that's not in the discv5 table
            // (see discv5.service.sendRequest message)
            // TODO: Fix discv5.service.sendRequest to accept either a `NodeId` or an `ENR`
            //this.client.addEnr(decodedEnr)
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
      log(`Error sending FINDNODES to ${shortId(dstId)} - ${err}`)
    }
  }

  public contentLookup = async (contentType: HistoryNetworkContentTypes, blockHash: string) => {
    const lookup = new Lookup(this, contentType, blockHash)
    const res = await lookup.startLookup()
    return res
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
    log(`Sending FINDCONTENT to ${shortId(dstId)} for ${networkId} subnetwork`)
    const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
    try {
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.CONTENT) {
        log(`Received FOUNDCONTENT from ${shortId(dstId)}`)
        // TODO: Switch this to use PortalWireMessageType.deserialize if type inference can be worked out
        const decoded = ContentMessageType.deserialize(res.slice(1))
        switch (decoded.selector) {
          case 0: {
            const id = Buffer.from(decoded.value as Uint8Array).readUInt16BE(0)
            log(`received uTP Connection ID ${id}`)
            this.sendUtpStreamRequest(dstId, id)
            break
          }
          case 1: {
            log(`received content ${Buffer.from(decoded.value as Uint8Array).toString()}`)
            const decodedKey = HistoryNetworkContentKeyUnionType.deserialize(key)
            // Store content in local DB
            await this.addContentToHistory(
              decodedKey.value.chainId,
              decodedKey.selector,
              toHexString(decodedKey.value.blockHash),
              decoded.value as Uint8Array
            )
            break
          }
          case 2: {
            log(`received ${decoded.value.length} ENRs`)
            break
          }
        }
        return decoded
      }
    } catch (err: any) {
      log(`Error sending FINDCONTENT to ${shortId(dstId)} - ${err.message}`)
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
    log(`Sending OFFER message to ${shortId(dstId)}`)
    const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
    if (res.length > 0) {
      try {
        const decoded = PortalWireMessageType.deserialize(res)
        if (decoded.selector === MessageCodes.ACCEPT) {
          log(`Received ACCEPT message from ${shortId(dstId)}`)
          log(decoded.value)
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
        log(`Error sending to ${shortId(dstId)} - ${err.message}`)
      }
    }
  }

  public sendUtpStreamRequest = async (dstId: string, id: number) => {
    // Initiate a uTP stream request with a SYN packet
    await this.uTP.initiateConnectionRequest(dstId, id)
  }
  public UtpStreamTest = async (dstId: string, id: number) => {
    // Initiate a uTP stream request with a SYN packet
    await this.uTP.initiateUtpTest(dstId, id)
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
    let _deserializedValue: Block | BlockHeader | undefined = undefined
    switch (contentType) {
      case HistoryNetworkContentTypes.BlockHeader: {
        try {
          _deserializedValue = BlockHeader.fromRLPSerializedHeader(Buffer.from(value))
        } catch (err: any) {
          log(`Invalid value provided for block header: ${err.toString()}`)
          return
        }
        break
      }
      case HistoryNetworkContentTypes.BlockBody: {
        try {
          const headerContentId = getContentId(1, blockHash, HistoryNetworkContentTypes.BlockHeader)
          let serializedHeader
          try {
            serializedHeader = await this.db.get(headerContentId)
          } catch {
            // Don't store block body where we don't have the header since we can't validate the data
            // TODO: Retrieve header from network if not available locally
            return
          }
          // Verify we can construct a valid block from the header and body provided
          reassembleBlock(fromHexString(serializedHeader), value)
        } catch (err: any) {
          log(`Invalid value provided for block body: ${err.toString()}`)
          return
        }
        break
      }
      case HistoryNetworkContentTypes.Receipt:
        throw new Error('Receipts data not implemented')
      default:
        throw new Error('unknown data type provided')
    }
    const key = getContentId(chainId, blockHash, contentType)
    await this.db.put(key, toHexString(value), (err: any) => {
      if (err) log(`Error putting content in history DB: ${err.toString()}`)
    })
    this.emit('ContentAdded', blockHash, contentType, toHexString(value))
    log(
      `added ${
        Object.keys(HistoryNetworkContentTypes)[
          Object.values(HistoryNetworkContentTypes).indexOf(contentType)
        ]
      } for ${blockHash} to content db`
    )

    // Offer stored content to nearest 1 nodes that should be interested (i.e. have a radius >= distance from the content)
    // TODO: Make # nodes content is offered to configurable based on further discussion
    const offerENRs = this.historyNetworkRoutingTable.nearest(key, 1)
    if (offerENRs.length > 0) {
      const encodedKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: contentType,
        value: { chainId: chainId, blockHash: fromHexString(blockHash) },
      })
      offerENRs.forEach((enr) => {
        if (distance(enr.nodeId, key) < this.historyNetworkRoutingTable.getRadius(enr.nodeId)!) {
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
        log(`Received State Subnetwork request`)
        break
      case SubNetworkIds.HistoryNetwork:
        log(`Received History Subnetwork request`)
        break
      case SubNetworkIds.UTPNetwork:
        log(`Received uTP packet`)
        this.handleUTP(srcId, message.id, message.request)
        return
      default:
        log(`Received TALKREQ message on unsupported protocol ${toHexString(message.protocol)}`)
        return
    }

    const messageType = message.request[0]
    log(`TALKREQUEST message received from ${srcId}`)
    switch (messageType) {
      case MessageCodes.PING:
        this.handlePing(srcId, message)
        break
      case MessageCodes.PONG:
        log(`PONG message not expected in TALKREQ`)
        break
      case MessageCodes.FINDNODES:
        this.handleFindNodes(srcId, message)
        break
      case MessageCodes.NODES:
        log(`NODES message not expected in TALKREQ`)
        break
      case MessageCodes.FINDCONTENT:
        this.handleFindContent(srcId, message)
        break
      case MessageCodes.CONTENT:
        log(`ACCEPT message not expected in TALKREQ`)
        break
      case MessageCodes.OFFER:
        this.handleOffer(srcId, message)
        break
      case MessageCodes.ACCEPT:
        log(`ACCEPT message not expected in TALKREQ`)
        break
      default:
        log(`Unrecognized message type received`)
    }
  }

  private onTalkResp = (src: INodeAddress, sourceId: ENR | null, message: ITalkRespMessage) => {
    const srcId = src.nodeId
    log(`TALKRESPONSE message received from ${srcId}, ${message.response.toString()}`)
  }

  private handleStreamedContent(rcvId: number, content: Uint8Array) {
    log(`received all content for ${rcvId}`)
    const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(content))
    this.addContentToHistory(
      1,
      HistoryNetworkContentTypes.BlockHeader,
      toHexString(header.hash()),
      content
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
    log(`Received FINDNODES request from ${shortId(srcId)}`)
    log(decoded)
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
    log(`Received OFFER request from ${shortId(srcId)}`)
    log(decoded)
    const msg = decoded.value as OfferMessage
    if (msg.contentKeys.length > 0) {
      try {
        if (msg.contentKeys.length > 0) {
          const contentIds = Array(msg.contentKeys.length).fill(false)
          let offerAccepted = false
          for (let x = 0; x < msg.contentKeys.length; x++) {
            try {
              await this.db.get(getContentIdFromSerializedKey(msg.contentKeys[x]))
            } catch (err) {
              offerAccepted = true
              contentIds[x] = true
              log(`Found some interesting content from ${shortId(srcId)}`)
            }
          }
          if (offerAccepted) {
            this.sendAccept(srcId, message, contentIds)
          }
        }
      } catch {
        log(`Something went wrong handling offer message`)
        // Send empty response if something goes wrong parsing content keys
        this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
      }
    }
  }

  private sendAccept = async (
    srcId: string,
    message: ITalkReqMessage,
    desiredContentKeys: boolean[]
  ) => {
    const id = randUint16()
    const connectionId = await this.uTP.awaitConnectionRequest(srcId, id)
    const payload: AcceptMessage = {
      connectionId: new Uint8Array(2).fill(connectionId),
      contentKeys: desiredContentKeys,
    }
    const encodedPayload = PortalWireMessageType.serialize({
      selector: MessageCodes.ACCEPT,
      value: payload,
    })
    log(`sending ACCEPT to ${shortId(srcId)} with connection`)
    await this.client.sendTalkResp(srcId, message.id, Buffer.from(encodedPayload))
  }

  private handleFindContent = async (srcId: string, message: ITalkReqMessage) => {
    const decoded = PortalWireMessageType.deserialize(message.request)
    log(`Received FINDCONTENT request from ${shortId(srcId)}`)
    log(decoded)
    const decodedContentMessage = decoded.value as FindContentMessage
    //Check to see if value in content db
    const lookupKey = getContentIdFromSerializedKey(decodedContentMessage.contentKey)
    let value = Uint8Array.from([])
    try {
      value = Buffer.from(fromHexString(await this.db.get(lookupKey)))
    } catch (err: any) {
      log(`Error retrieving content -- ${err.toString()}`)
    }

    if (value.length === 0) {
      switch (toHexString(message.protocol)) {
        case SubNetworkIds.HistoryNetwork:
          {
            const contentId = getContentIdFromSerializedKey(decodedContentMessage.contentKey)
            // TODO: Decide if we should send more than 3 nodes back in a response since we likely exceed
            // UDP talkresp packet size with more than 3 ENRs at 300 bytes per ENR
            const ENRs = this.historyNetworkRoutingTable.nearest(contentId, 3)
            const encodedEnrs = ENRs.map((enr) => {
              // Only include ENR if not the ENR of the requesting node and the ENR is closer to the
              // contentId than this node
              return enr.nodeId !== srcId &&
                distance(enr.nodeId, contentId) < distance(this.client.enr.nodeId, contentId)
                ? enr.encode()
                : undefined
            }).filter((enr) => enr !== undefined)
            if (encodedEnrs.length > 0) {
              log(`Found ${encodedEnrs.length} closer to content than us`)
              // @ts-ignore
              const payload = ContentMessageType.serialize({ selector: 2, value: encodedEnrs })
              this.client.sendTalkResp(
                srcId,
                message.id,
                Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)])
              )
            } else {
              log(`Found no ENRs closer to content than us`)
              this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
            }
          }
          break
        default:
          this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
      }
    } else if (value && value.length < MAX_PACKET_SIZE) {
      log(
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
      log(
        'Found value for requested content.  Larger than 1 packet.  uTP stream needed.' +
          Buffer.from(decodedContentMessage.contentKey).toString('hex') +
          value.slice(0, 10) +
          `...`
      )
      this.uTP.contents[srcId] = value
      log(`Generating Random Connection Id...`)
      const _id = randUint16()
      const idBuffer = Buffer.alloc(2)
      idBuffer.writeUInt16BE(_id, 0)
      const id = Uint8Array.from(idBuffer)
      log(`Sending FOUND_CONTENT message with CONNECTION ID: ${_id}`)
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
      log(
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
          log(`removed ${srcId} from State Network Routing Table`)
          this.emit('NodeRemoved', srcId, SubNetworkIds.StateNetwork)
          return
        }
        if (!this.stateNetworkRoutingTable.getValue(srcId)) {
          log(`adding ${srcId} to stateNetwork routing table`)
          this.stateNetworkRoutingTable.insertOrUpdate(enr!, EntryStatus.Connected)
          const decodedPayload = PingPongCustomDataType.deserialize(Uint8Array.from(customPayload))
          this.stateNetworkRoutingTable.updateRadius(srcId, decodedPayload.radius)
          this.emit('NodeAdded', srcId, SubNetworkIds.StateNetwork)
          return
        }
        break
      }
      case SubNetworkIds.HistoryNetwork: {
        if (!customPayload) {
          this.historyNetworkRoutingTable.removeById(srcId)
          this.historyNetworkRoutingTable.removeFromRadiusMap(srcId)
          log(`removed ${srcId} from History Network Routing Table`)
          this.emit('NodeRemoved', srcId, SubNetworkIds.HistoryNetwork)
          return
        }
        if (!this.historyNetworkRoutingTable.getValue(srcId)) {
          log(`adding ${srcId} to historyNetwork routing table`)
          this.historyNetworkRoutingTable.insertOrUpdate(enr!, EntryStatus.Connected)
          const decodedPayload = PingPongCustomDataType.deserialize(Uint8Array.from(customPayload))
          this.historyNetworkRoutingTable.updateRadius(srcId, decodedPayload.radius)
          this.emit('NodeAdded', srcId, SubNetworkIds.HistoryNetwork)
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
  public sendPortalNetworkMessage = async (
    dstId: NodeId,
    payload: Buffer,
    networkId: SubNetworkIds
  ): Promise<Buffer> => {
    const enr = this.historyNetworkRoutingTable.getValue(dstId)
    try {
      const res = await this.client.sendTalkReq(dstId, payload, fromHexString(networkId), enr)
      return res
    } catch (err: any) {
      log(`Error sending TALKREQ message: ${err.message}`)
      if (networkId !== SubNetworkIds.UTPNetwork) {
        this.updateSubnetworkRoutingTable(dstId, networkId)
      }
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
      .filter((pair) => pair.distance > 239 && pair.bucket.size() < 16)
    if (notFullBuckets.length > 0) {
      const randomDistance = Math.trunc(Math.random() * 10)
      const distance = notFullBuckets[randomDistance].distance ?? notFullBuckets[0].distance
      log(`Refreshing bucket at distance ${distance}`)
      const randomNodeAtDistance = generateRandomNodeIdAtDistance(this.client.enr.nodeId, distance)
      this.nodeLookup(randomNodeAtDistance)
    }
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table for nodes in the kbucket and recursively
   * requests peers closer to the `nodeSought` until either the node is found or there are no more peers to query
   * @param nodeSought nodeId of node sought in lookup
   */
  public nodeLookup = async (nodeSought: NodeId) => {
    const closestPeers = this.historyNetworkRoutingTable.nearest(nodeSought, 5)
    const newPeers: ENR[] = []
    let finished = false
    while (!finished) {
      if (closestPeers.length === 0) {
        finished = true
        continue
      }
      const nearestPeer = closestPeers.shift()
      // Calculates log2distance between queried peer and `nodeSought`
      const distanceToSoughtPeer = log2Distance(nearestPeer!.nodeId, nodeSought)
      // Request nodes in the given kbucket (i.e. log2distance) on the receiving peer's routing table for the `nodeSought`
      const res = await this.sendFindNodes(
        nearestPeer!.nodeId,
        Uint16Array.from([distanceToSoughtPeer]),
        SubNetworkIds.HistoryNetwork
      )

      if (res?.enrs && res.enrs.length > 0) {
        const distanceFromSoughtNodeToQueriedNode = distance(closestPeers[0].nodeId, nodeSought)
        res.enrs.forEach((enr) => {
          if (!finished) {
            const decodedEnr = ENR.decode(Buffer.from(enr))
            if (decodedEnr.nodeId === nodeSought) {
              // `nodeSought` was found -- add to table and terminate lookup
              finished = true
              this.historyNetworkRoutingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
              this.sendPing(decodedEnr.nodeId, SubNetworkIds.HistoryNetwork)
            } else if (
              distance(decodedEnr.nodeId, nodeSought) < distanceFromSoughtNodeToQueriedNode
            ) {
              // if peer received is closer than peer that sent ENR, add to front of `closestPeers` list
              closestPeers.unshift(decodedEnr)
              // Add newly found peers to list for storing in routing table
              newPeers.push(decodedEnr)
            }
          }
        })
      }
    }
    newPeers.forEach((enr) => {
      // Add all newly found peers to the subnetwork routing table
      this.historyNetworkRoutingTable.insertOrUpdate(enr, EntryStatus.Connected)
      this.sendPing(enr.nodeId, SubNetworkIds.HistoryNetwork)
    })
  }
}
