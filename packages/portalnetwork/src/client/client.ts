import {
  Discv5,
  SignableENR,
  IDiscv5CreateOptions,
  NodeId,
  ENR,
  createKeypairFromPeerId,
} from '@chainsafe/discv5'
import { ITalkReqMessage, ITalkRespMessage } from '@chainsafe/discv5/message'
import { EventEmitter } from 'events'
import debug, { Debugger } from 'debug'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { BeaconLightClientNetwork, ProtocolId, StateProtocol } from '../subprotocols/index.js'
import {
  PortalNetworkEventEmitter,
  PortalNetworkMetrics,
  PortalNetworkOpts,
  TransportLayer,
} from './types.js'
import type { PeerId, Secp256k1PeerId } from '@libp2p/interface-peer-id'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo.js'
import { PortalNetworkUTP } from '../wire/utp/PortalNetworkUtp/index.js'

import { BaseProtocol } from '../subprotocols/protocol.js'
import { HistoryProtocol } from '../subprotocols/history/history.js'
import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import { CapacitorUDPTransportService, WebSocketTransportService } from '../transports/index.js'
import { LRUCache } from 'lru-cache'
import { dirSize, MEGABYTE } from '../util/index.js'
import { DBManager } from './dbManager.js'
import { peerIdFromKeys } from '@libp2p/peer-id'

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
  private unverifiedSessionCache: LRUCache<NodeId, Multiaddr>

  public static create = async (opts: Partial<PortalNetworkOpts>) => {
    const defaultConfig: IDiscv5CreateOptions = {
      enr: {} as SignableENR,
      peerId: {} as Secp256k1PeerId,
      bindAddrs: {
        ip4: multiaddr(),
      },
      config: {
        addrVotesToUpdateEnr: 5,
        enrUpdate: true,
        allowUnverifiedSessions: true,
        requestTimeout: 3000,
        sessionEstablishTimeout: 3000,
      },
    }
    const config = { ...defaultConfig, ...opts.config }
    let bootnodes
    if (opts.rebuildFromMemory && opts.db) {
      const prevEnrString = await opts.db.get('enr')
      const prevPrivateKey = await opts.db.get('privateKey')
      const prevPublicKey = await opts.db.get('publicKey')

      config.peerId = await peerIdFromKeys(
        fromHexString(prevPublicKey),
        fromHexString(prevPrivateKey),
      )

      config.enr = SignableENR.decodeTxt(prevEnrString, createKeypairFromPeerId(config.peerId))
      const prev_peers = JSON.parse(await opts.db.get('peers')) as string[]
      bootnodes =
        opts.bootnodes && opts.bootnodes.length > 0 ? opts.bootnodes.concat(prev_peers) : prev_peers
    } else if (opts.config?.enr === undefined) {
      config.peerId = opts.config?.peerId ?? (await createSecp256k1PeerId())
      config.enr = SignableENR.createFromPeerId(config.peerId)

      bootnodes = opts.bootnodes
    } else {
      config.enr = opts.config.enr as SignableENR
    }
    let ma
    if (opts.config?.bindAddrs?.ip4 === undefined) {
      if (opts.bindAddress) {
        ma = multiaddr(`/ip4/${opts.bindAddress}/udp/${Math.floor(Math.random() * 990) + 9009}`)
        config.enr.setLocationMultiaddr(ma)
        config.bindAddrs.ip4 = ma
      } else {
        let ip = ''
        try {
          ip = await (await fetch('https://api.ipify.org')).text()
        } catch (e) {
          ip = '127.0.0.1'
        }
        ma = multiaddr(`/ip4/${ip}/udp/${Math.floor(Math.random() * 990) + 9009}`)
        config.enr.setLocationMultiaddr(ma)
        config.bindAddrs.ip4 = ma
      }
    } else {
      ma = opts.config.bindAddrs.ip4
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
      config: config,
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
    this.discv5.enr.encode()
    this.logger = debug(this.discv5.enr.nodeId.slice(0, 5)).extend('Portal')
    this.protocols = new Map()
    this.bootnodes = opts.bootnodes ?? []
    this.peerId = opts.config.peerId as PeerId
    this.supportsRendezvous = false
    this.unverifiedSessionCache = new LRUCache({ max: 2500 })
    this.uTP = new PortalNetworkUTP(this.logger)
    this.refreshListeners = new Map()
    this.db = new DBManager(
      this.discv5.enr.nodeId,
      this.logger,
      opts.dbSize,
      opts.supportedProtocols,
      opts.db,
    ) as DBManager
    opts.supportedProtocols = opts.supportedProtocols ?? []
    for (const protocol of opts.supportedProtocols) {
      switch (protocol) {
        case ProtocolId.HistoryNetwork:
          this.protocols.set(protocol, new HistoryProtocol(this, opts.radius))
          break
        case ProtocolId.StateNetwork:
          this.protocols.set(protocol, new StateProtocol(this, opts.radius))
          break
        case ProtocolId.BeaconLightClientNetwork:
          this.protocols.set(protocol, new BeaconLightClientNetwork(this, opts.radius))
          break
        case ProtocolId.Rendezvous:
          this.supportsRendezvous = true
          break
        case ProtocolId.BeaconLightClientNetwork:
          this.protocols.set(protocol, new BeaconLightClientNetwork(this, opts.radius))
          break
      }
    }

    // Set version info pair in ENR
    this.discv5.enr.set('c', new TextEncoder().encode('u 0.0.1'))
    // Event handling
    // TODO: Decide whether to put everything on a centralized event bus
    this.discv5.on('talkReqReceived', this.onTalkReq)
    this.discv5.on('talkRespReceived', this.onTalkResp)
    this.uTP.on('Send', async (peerId: string, msg: Buffer, protocolId: ProtocolId) => {
      const enr = this.protocols.get(protocolId)?.routingTable.getWithPending(peerId)?.value
      try {
        await this.sendPortalNetworkMessage(enr ?? peerId, msg, protocolId, true)
        this.uTP.emit('Sent')
      } catch {
        this.uTP.closeRequest(msg.readUInt16BE(2), peerId)
      }
    })
    // if (this.discv5.sessionService.transport instanceof HybridTransportService) {
    //   ;(this.discv5.sessionService as any).send = this.send.bind(this)
    // }
    this.discv5.sessionService.on('established', async (nodeAddr, enr, _, _verified) => {
      this.discv5.findEnr(enr.nodeId) === undefined && this.discv5.addEnr(enr)

      // if (!verified || !enr.getLocationMultiaddr('udp')) {
      //   // If a node provides an invalid ENR during the discv5 handshake, we cache the multiaddr
      //   // corresponding to the node's observed IP/Port so that we can send outbound messages to
      //   // those nodes later on if needed.  This is currently used by uTP when responding to
      //   // FINDCONTENT requests from nodes with invalid ENRs.
      //   const peerId = await createPeerIdFromKeypair(enr.keypair)
      //   this.unverifiedSessionCache.set(
      //     enr.nodeId,
      //     multiaddr(nodeAddr.socketAddr.toString() + '/p2p/' + peerId.toString())
      //   )
      //   this.logger(this.unverifiedSessionCache.get(enr.nodeId))
      // }
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
      // Start kbucket refresh on 30 second interval
      this.refreshListeners.set(
        protocol.protocolId,
        setInterval(() => protocol.bucketRefresh(), 30000),
      )
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
  public enableLog = (namespaces: string = '*Portal*,*uTP*,*discv5*') => {
    debug.enable(namespaces)
  }

  /**
   * Store node details in DB for node restart
   */
  public storeNodeDetails = async () => {
    const peers: string[] = []
    for (const protocol of this.protocols) {
      ;(protocol[1] as any).routingTable.values().forEach((enr: ENR) => {
        peers.push(enr.encodeTxt())
      })
    }
    try {
      await this.db.batch([
        {
          type: 'put',
          key: 'enr',
          value: this.discv5.enr.encodeTxt(),
        },
        {
          type: 'put',
          key: 'privateKey',
          value: toHexString(this.peerId.privateKey!),
        },
        {
          type: 'put',
          key: 'publicKey',
          value: toHexString(this.peerId.publicKey!),
        },
        {
          type: 'put',
          key: 'peers',
          value: JSON.stringify(peers),
        },
      ])
    } catch (err) {
      console.log('error', err)
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
        `Received TALKREQ message on unsupported protocol ${toHexString(message.protocol)}`,
      )
      await this.sendPortalNetworkResponse(src, message.id, new Uint8Array())

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
    packetBuffer: Buffer,
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
    payload: Uint8Array,
    protocolId: ProtocolId,
    utpMessage?: boolean,
  ): Promise<Uint8Array> => {
    const messageProtocol = utpMessage ? ProtocolId.UTPNetwork : protocolId
    try {
      this.metrics?.totalBytesSent.inc(payload.length)
      let nodeAddr
      if (typeof enr === 'string') {
        // If ENR is not provided, look up ENR in protocol routing table by nodeId
        const protocol = this.protocols.get(protocolId)
        if (protocol) {
          nodeAddr = protocol.routingTable.getWithPending(enr)?.value
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
        return new Uint8Array()
      }
      const res = await this.discv5.sendTalkReq(
        nodeAddr,
        Buffer.from(payload),
        fromHexString(messageProtocol),
      )
      return res
    } catch (err: any) {
      if (protocolId === ProtocolId.UTPNetwork) {
        throw new Error(`Error sending TALKREQ message: ${err}`)
      } else {
        return new Uint8Array()
      }
    }
  }

  public sendPortalNetworkResponse = async (
    src: INodeAddress,
    requestId: bigint,
    payload: Uint8Array,
  ) => {
    this.discv5.sendTalkResp(src, requestId, payload)
  }
}
