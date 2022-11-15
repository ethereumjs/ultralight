import {
  createKeypairFromPeerId,
  createPeerIdFromKeypair,
  Discv5,
  ENR,
  IDiscv5CreateOptions,
  NodeId,
} from '@chainsafe/discv5'
import { ITalkReqMessage, ITalkRespMessage } from '@chainsafe/discv5/message'
import { EventEmitter } from 'events'
import debug, { Debugger } from 'debug'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { ProtocolId } from '../subprotocols/index.js'
import {
  PortalNetworkEventEmitter,
  PortalNetworkMetrics,
  PortalNetworkOpts,
  TransportLayer,
} from './types.js'
import { peerIdFromString } from '@libp2p/peer-id'
import type { PeerId, Secp256k1PeerId } from '@libp2p/interface-peer-id'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo.js'
import { PortalNetworkUTP } from '../wire/utp/PortalNetworkUtp/index.js'

import { BaseProtocol } from '../subprotocols/protocol.js'
import { HistoryProtocol } from '../subprotocols/history/history.js'
import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import { CapacitorUDPTransportService, WebSocketTransportService } from '../transports/index.js'
import LRU from 'lru-cache'
import { dirSize, MEGABYTE } from '../util/index.js'
import { DBManager } from './dbManager.js'

export class PortalNetwork extends (EventEmitter as { new (): PortalNetworkEventEmitter }) {
  discv5: Discv5
  protocols: Map<ProtocolId, BaseProtocol>
  uTP: PortalNetworkUTP
  db: DBManager
  bootnodes: string[]
  metrics: PortalNetworkMetrics | undefined
  logger: Debugger
  private refreshListeners: Map<ProtocolId, ReturnType<typeof setInterval>>
  private peerId: PeerId
  private supportsRendezvous: boolean
  private unverifiedSessionCache: LRU<NodeId, Multiaddr>

  public static create = async (opts: Partial<PortalNetworkOpts>) => {
    const defaultConfig: IDiscv5CreateOptions = {
      enr: {} as ENR,
      peerId: {} as Secp256k1PeerId,
      multiaddr: multiaddr(),
      config: {
        addrVotesToUpdateEnr: 5,
        enrUpdate: true,
        allowUnverifiedSessions: true,
      },
    }
    const config = { ...defaultConfig, ...opts.config }
    let bootnodes
    if (opts.rebuildFromMemory && opts.db) {
      const prev_enr_string = await opts.db.get('enr')
      const prev_peerid = await opts.db.get('peerid')
      config.enr = ENR.decodeTxt(prev_enr_string)
      config.peerId = await peerIdFromString(prev_peerid)
      const prev_peers = JSON.parse(await opts.db.get('peers')) as string[]
      bootnodes =
        opts.bootnodes && opts.bootnodes.length > 0 ? opts.bootnodes.concat(prev_peers) : prev_peers
    } else {
      config.peerId = opts.config?.peerId ?? (await createSecp256k1PeerId())
      if (opts.config?.enr) {
        config.enr =
          typeof opts.config.enr === 'string' ? ENR.decodeTxt(opts.config.enr) : opts.config.enr
      } else {
        config.enr = ENR.createFromPeerId(config.peerId)
      }
      bootnodes = opts.bootnodes
    }
    let ma
    if (opts.bindAddress) {
      ma = multiaddr(`/ip4/${opts.bindAddress}/udp/${Math.floor(Math.random() * 20)}`)
      config.enr.setLocationMultiaddr(ma)
    } else {
      ma = multiaddr()
    }

    // Configure db size calculation
    let dbSize
    switch (opts.transport) {
      case TransportLayer.WEB:
      case TransportLayer.MOBILE:
        dbSize = async function () {
          // eslint-disable-next-line no-undef
          const sizeEstimate = await window.navigator.storage.estimate()
          return sizeEstimate.usage ? sizeEstimate.usage / MEGABYTE : 0
        }
        break
      case TransportLayer.NODE:
      default:
        dbSize = async function () {
          return dirSize(opts.dataDir ?? './')
        }
    }

    // Configure transport layer
    switch (opts.transport) {
      case TransportLayer.WEB: {
        opts.proxyAddress = opts.proxyAddress ?? 'ws://127.0.0.1:5050'
        config.transport = new WebSocketTransportService(ma, config.enr.nodeId, opts.proxyAddress)
        break
      }
      case TransportLayer.MOBILE:
        config.transport = new CapacitorUDPTransportService(ma, config.enr.nodeId)
        break
      case TransportLayer.NODE:
        break
    }

    return new PortalNetwork({
      config,
      radius: 2n ** 256n,
      bootnodes,
      db: opts.db,
      supportedProtocols: opts.supportedProtocols ?? [ProtocolId.HistoryNetwork],
      dbSize: dbSize as () => Promise<number>,
      metrics: opts.metrics,
    })
  }

  /**
   *
   * Portal Network constructor
   * @param opts a dictionary of `PortalNetworkOpts`
   */
  constructor(opts: PortalNetworkOpts) {
    // eslint-disable-next-line constructor-super
    super()

    this.discv5 = Discv5.create(opts.config as IDiscv5CreateOptions)
    // cache signature to ensure ENR can be encoded on startup
    this.discv5.enr.encode(createKeypairFromPeerId(opts.config.peerId as PeerId).privateKey)
    this.logger = debug(this.discv5.enr.nodeId.slice(0, 5)).extend('Portal')
    this.protocols = new Map()
    this.bootnodes = opts.bootnodes ?? []
    this.peerId = opts.config.peerId as PeerId
    this.supportsRendezvous = false
    this.unverifiedSessionCache = new LRU({ max: 2500 })
    this.uTP = new PortalNetworkUTP(this.logger)
    this.refreshListeners = new Map()
    this.db = new DBManager(
      this.discv5.enr.nodeId,
      this.logger,
      opts.dbSize,
      opts.supportedProtocols,
      opts.db
    ) as DBManager
    opts.supportedProtocols = opts.supportedProtocols ?? []
    for (const protocol of opts.supportedProtocols) {
      switch (protocol) {
        case ProtocolId.HistoryNetwork:
          this.protocols.set(protocol, new HistoryProtocol(this, opts.radius, opts.metrics))
          break
        case ProtocolId.Rendezvous:
          this.supportsRendezvous = true
          break
      }
    }

    // Event handling
    // TODO: Decide whether to put everything on a centralized event bus
    this.discv5.on('talkReqReceived', this.onTalkReq)
    this.discv5.on('talkRespReceived', this.onTalkResp)
    this.uTP.on('Send', async (peerId: string, msg: Buffer, protocolId: ProtocolId) => {
      const enr = this.protocols.get(protocolId)?.routingTable.getValue(peerId)
      try {
        await this.sendPortalNetworkMessage(enr ?? peerId, msg, protocolId, true)
      } catch {
        this.uTP.closeRequest(peerId)
      }
    })
    this.discv5.sessionService.on('established', async (nodeAddr, enr, _, verified) => {
      if (!verified || !enr.getLocationMultiaddr('udp')) {
        // If a node provides an invalid ENR during the discv5 handshake, we cache the multiaddr
        // corresponding to the node's observed IP/Port so that we can send outbound messages to
        // those nodes later on if needed.  This is currently used by uTP when responding to
        // FINDCONTENT requests fron nodes with invalid ENRs.
        const peerId = await createPeerIdFromKeypair(enr.keypair)
        this.unverifiedSessionCache.set(
          enr.nodeId,
          multiaddr(nodeAddr.socketAddr.toString() + '/p2p/' + peerId.toString())
        )
        this.logger(this.unverifiedSessionCache.get(enr.nodeId))
      }
    })

    if (opts.metrics) {
      this.metrics = opts.metrics
      this.metrics.knownDiscv5Nodes.collect = () =>
        this.metrics?.knownDiscv5Nodes.set(this.discv5.kadValues().length)
      this.metrics.currentDBSize.collect = async () => {
        this.metrics?.currentDBSize.set(await this.db.currentSize())
      }
    }
  }

  /**
   * Starts the portal network client
   */
  public start = async () => {
    await this.discv5.start()
    await this.db.open()
    for (const protocol of this.protocols.values()) {
      await protocol.init()
      // Start kbucket refresh on 30 second interval
      this.refreshListeners.set(
        protocol.protocolId,
        setInterval(() => protocol.bucketRefresh(), 30000)
      )
      this.bootnodes.forEach(async (peer: string) => {
        await protocol.addBootNode(peer)
      })
    }
  }

  /**
   * Stops the portal network client and cleans up listeners
   */
  public stop = async () => {
    await this.discv5.stop()
    await this.discv5.removeAllListeners()
    await this.removeAllListeners()
    await this.db.close()
    this.refreshListeners.forEach((protocol) => clearInterval(protocol))
  }

  /**
   *
   * @param namespaces comma separated list of logging namespaces
   * defaults to "*Portal*,*uTP*"
   */
  public enableLog = (namespaces: string = '*Portal*,*uTP*') => {
    debug.enable(namespaces)
  }

  /**
   * Store node details in DB for node restart
   */
  public storeNodeDetails = async () => {
    try {
      await this.db.batch([
        {
          type: 'put',
          key: 'enr',
          value: this.discv5.enr.encodeTxt(this.discv5.keypair.privateKey),
        },
        {
          type: 'put',
          key: 'peerid',
          value: this.peerId.toString(),
        },
      ])
    } catch (err) {}
    const peers: string[] = []
    for (const protocol of this.protocols) {
      ;(protocol[1] as any).routingTable.values().forEach((enr: ENR) => {
        peers.push(enr.encodeTxt())
      })
      await this.db.put('peers', JSON.stringify(peers))
    }
  }

  private onTalkReq = async (src: INodeAddress, sourceId: ENR | null, message: ITalkReqMessage) => {
    this.metrics?.totalBytesReceived.inc(message.request.length)
    if (toHexString(message.protocol) === ProtocolId.UTPNetwork) {
      this.handleUTP(src, src.nodeId, message, message.request)
      return
    }
    const protocol = this.protocols.get(toHexString(message.protocol) as ProtocolId)
    if (!protocol) {
      this.logger(
        `Received TALKREQ message on unsupported protocol ${toHexString(message.protocol)}`
      )
      return
    }

    protocol.handle(message, src)
  }

  private onTalkResp = (src: INodeAddress, sourceId: ENR | null, message: ITalkRespMessage) => {
    this.metrics?.totalBytesReceived.inc(message.response.length)
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
    await this.sendPortalNetworkResponse(src, msg.id, new Uint8Array())
    await this.uTP.handleUtpPacket(packetBuffer, srcId)
  }

  /**
   *
   * @param dstId `NodeId` of message recipient
   * @param payload `Buffer` serialized payload of message
   * @param protocolId subprotocol ID of subprotocol message is being sent on
   * @returns response from `dstId` as `Buffer` or null `Buffer`
   */
  public sendPortalNetworkMessage = async (
    enr: ENR | string,
    payload: Buffer,
    protocolId: ProtocolId,
    utpMessage?: boolean
  ): Promise<Buffer> => {
    const messageProtocol = utpMessage ? ProtocolId.UTPNetwork : protocolId
    try {
      this.metrics?.totalBytesSent.inc(payload.length)
      let nodeAddr
      if (typeof enr === 'string') {
        // If ENR is not provided, look up ENR in protocol routing table by nodeId
        const protocol = this.protocols.get(protocolId)
        if (protocol) {
          nodeAddr = protocol.routingTable.getValue(enr)
          if (!nodeAddr) {
            // Check in unverified sessions cache if no ENR found in routing table
            nodeAddr = this.unverifiedSessionCache.get(enr)
          }
        }
      } else {
        // Assume enr is of type ENR and send request as is
        nodeAddr = enr
      }
      if (!nodeAddr) {
        this.logger(`${enr} has no reachable address.  Aborting request`)
        return Buffer.from([])
      }
      const res = await this.discv5.sendTalkReq(nodeAddr, payload, fromHexString(messageProtocol))
      return res
    } catch (err: any) {
      throw new Error(`Error sending TALKREQ message: ${err}`)
    }
  }

  public sendPortalNetworkResponse = async (
    src: INodeAddress,
    requestId: bigint,
    payload: Uint8Array
  ) => {
    this.discv5.sendTalkResp(src, requestId, payload)
  }
}
