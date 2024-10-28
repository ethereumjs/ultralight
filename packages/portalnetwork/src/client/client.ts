import { Discv5 } from '@chainsafe/discv5'
import { SignableENR } from '@chainsafe/enr'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import debug from 'debug'
import { EventEmitter } from 'events'
import { LRUCache } from 'lru-cache'

import { HistoryNetwork } from '../networks/history/history.js'
import {
  BeaconLightClientNetwork,
  NetworkId,
  StateNetwork,
  SyncStrategy,
} from '../networks/index.js'
import { CapacitorUDPTransportService, WebSocketTransportService } from '../transports/index.js'
import { MEGABYTE, dirSize } from '../util/index.js'
import { PortalNetworkUTP } from '../wire/utp/PortalNetworkUtp/index.js'

import { DBManager } from './dbManager.js'
import { ETH } from './eth.js'
import { TransportLayer } from './types.js'

import type { PortalNetworkEventEmitter, PortalNetworkMetrics, PortalNetworkOpts } from './types.js'
import type { BaseNetwork } from '../networks/network.js'
import type { IDiscv5CreateOptions, SignableENRInput } from '@chainsafe/discv5'
import type { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo.js'
import type { ITalkReqMessage, ITalkRespMessage } from '@chainsafe/discv5/message'
import type { ENR, NodeId } from '@chainsafe/enr'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Debugger } from 'debug'

export class PortalNetwork extends (EventEmitter as { new (): PortalNetworkEventEmitter }) {
  eventLog: boolean
  discv5: Discv5
  networks: Map<NetworkId, BaseNetwork>
  uTP: PortalNetworkUTP
  utpTimout: number
  db: DBManager
  bootnodes: string[]
  metrics: PortalNetworkMetrics | undefined
  logger: Debugger
  ETH: ETH
  private refreshListeners: Map<NetworkId, ReturnType<typeof setInterval>>
  private supportsRendezvous: boolean
  private unverifiedSessionCache: LRUCache<NodeId, Multiaddr>

  public static create = async (opts: Partial<PortalNetworkOpts>) => {
    const defaultConfig: IDiscv5CreateOptions = {
      enr: opts.config?.enr ?? ({} as SignableENRInput),
      privateKey: opts.config?.privateKey ?? (await keys.generateKeyPair('secp256k1')),
      bindAddrs: {
        ip4: multiaddr(),
      },
      config: {
        addrVotesToUpdateEnr: 5,
        enrUpdate: true,
        allowUnverifiedSessions: true,
        requestTimeout: 3000,
        sessionEstablishTimeout: 3000,
        lookupTimeout: 3000,
        sessionTimeout: 3000,
        requestRetries: 2,
      },
    }
    const config = { ...defaultConfig, ...opts.config }
    let bootnodes = opts.bootnodes
    if (opts.rebuildFromMemory === true && opts.db) {
      const prevEnrString = await opts.db.get('enr')
      const prevPrivateKey = await opts.db.get('privateKey')
      config.enr = SignableENR.decodeTxt(prevEnrString, hexToBytes(prevPrivateKey))
      const prev_peers = JSON.parse(await opts.db.get('peers')) as string[]
      bootnodes =
        opts.bootnodes && opts.bootnodes.length > 0 ? opts.bootnodes.concat(prev_peers) : prev_peers
    } else if (opts.config?.enr === undefined) {
      config.enr = SignableENR.createV4(config.privateKey.raw)

      bootnodes = opts.bootnodes
    } else {
      config.enr = opts.config.enr as SignableENR
    }
    let ma
    if (opts.config?.bindAddrs?.ip4 === undefined) {
      if (opts.bindAddress !== undefined) {
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
          return sizeEstimate.usage !== undefined ? sizeEstimate.usage / MEGABYTE : 0
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

    const portal = new PortalNetwork({
      config,
      bootnodes,
      db: opts.db,
      supportedNetworks: opts.supportedNetworks ?? [
        { networkId: NetworkId.HistoryNetwork, maxStorage: 1024 },
      ],
      dbSize: dbSize as () => Promise<number>,
      metrics: opts.metrics,
      trustedBlockRoot: opts.trustedBlockRoot,
      eventLog: opts.eventLog,
      utpTimeout: opts.utpTimeout,
    })
    for (const network of portal.networks.values()) {
      try {
        // Check for stored radius in db
        const storedRadius = await network.db.db.get('radius')
        await network.setRadius(BigInt(storedRadius))
      } catch {
        continue
      }
      await network.prune()
    }
    return portal
  }

  /**
   *
   * Portal Network constructor
   * @param opts a dictionary of `PortalNetworkOpts`
   */
  constructor(opts: PortalNetworkOpts) {
    // eslint-disable-next-line constructor-super
    super()
    this.eventLog = opts.eventLog ?? false
    this.discv5 = Discv5.create(opts.config as IDiscv5CreateOptions)
    // cache signature to ensure ENR can be encoded on startup
    this.discv5.enr.encode()
    this.logger = debug(this.discv5.enr.nodeId.slice(0, 5)).extend('Portal')
    this.networks = new Map()
    this.bootnodes = opts.bootnodes ?? []
    this.supportsRendezvous = false
    this.unverifiedSessionCache = new LRUCache({ max: 2500 })
    this.uTP = new PortalNetworkUTP(this)
    this.utpTimout = opts.utpTimeout ?? 180000 // set default utpTimeout to 3 minutes
    this.refreshListeners = new Map()
    this.db = new DBManager(this.discv5.enr.nodeId, this.logger, opts.dbSize, opts.db) as DBManager
    opts.supportedNetworks = opts.supportedNetworks ?? []
    for (const network of opts.supportedNetworks) {
      switch (network.networkId) {
        case NetworkId.HistoryNetwork:
          this.networks.set(
            network.networkId,
            new HistoryNetwork({
              client: this,
              networkId: NetworkId.HistoryNetwork,
              maxStorage: network.maxStorage,
              db: network.db,
            }),
          )
          break
        case NetworkId.StateNetwork:
          this.networks.set(
            network.networkId,
            new StateNetwork({
              client: this,
              networkId: NetworkId.StateNetwork,
              maxStorage: network.maxStorage,
              db: network.db,
            }),
          )
          break
        case NetworkId.BeaconChainNetwork:
          {
            const syncStrategy =
              opts.trustedBlockRoot !== undefined
                ? SyncStrategy.TrustedBlockRoot
                : SyncStrategy.PollNetwork
            this.networks.set(
              network.networkId,
              new BeaconLightClientNetwork({
                client: this,
                networkId: NetworkId.BeaconChainNetwork,
                maxStorage: network.maxStorage,
                trustedBlockRoot: opts.trustedBlockRoot,
                sync: syncStrategy,
                db: network.db,
              }),
            )
          }
          break
        case NetworkId.Rendezvous:
          this.supportsRendezvous = true
          break
      }
    }
    for (const network of this.networks.values()) {
      this.db.sublevels.set(network.networkId, network.db)
    }

    this.ETH = new ETH(this)

    // Set version info pair in ENR
    this.discv5.enr.set('c', new TextEncoder().encode('u 0.0.1'))
    // Event handling
    // TODO: Decide whether to put everything on a centralized event bus
    this.discv5.on('talkReqReceived', this.onTalkReq)
    this.discv5.on('talkRespReceived', this.onTalkResp)
    // if (this.discv5.sessionService.transport instanceof HybridTransportService) {
    //   ;(this.discv5.sessionService as any).send = this.send.bind(this)
    // }
    this.discv5.sessionService.on('established', async (nodeAddr, enr, _, verified) => {
      this.discv5.findEnr(enr.nodeId) === undefined && this.discv5.addEnr(enr)

      if (!verified || !enr.getLocationMultiaddr('udp')) {
        // If a node provides an invalid ENR during the discv5 handshake, we cache the multiaddr
        // corresponding to the node's observed IP/Port so that we can send outbound messages to
        // those nodes later on if needed.  This is currently used by uTP when responding to
        // FINDCONTENT requests from nodes with invalid ENRs.
        const peerId = enr.peerId
        this.unverifiedSessionCache.set(
          enr.nodeId,
          multiaddr(nodeAddr.socketAddr.toString() + '/p2p/' + peerId.toString()),
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
    const storedIndex = await this.db.getBlockIndex()
    for (const network of this.networks.values()) {
      try {
        // Check for stored radius in db
        const storedRadius = await network.db.db.get('radius')
        await network.setRadius(BigInt(storedRadius))
      } catch {
        // No action
      }
      if (network instanceof HistoryNetwork) {
        network.blockHashIndex = storedIndex
      }
      network.startRefresh()
      await network.prune()
    }
    void this.bootstrap()
  }

  /**
   * Tries to connect to any pre-configured bootnodes
   */
  public bootstrap = async () => {
    for (const network of this.networks) {
      for (const enr of this.bootnodes) {
        try {
          await network[1].addBootNode(enr)
          network[1].logger(`Added bootnode ${enr} to ${network[1].networkId}`)
        } catch (error: any) {
          throw new Error(`Error adding bootnode ${enr} to network \
          ${network[1].networkId}: ${error.message ?? error}`)
        }
      }
    }
  }
  /**
   * Stops the portal network client and cleans up listeners
   */
  public stop = async () => {
    await this.discv5.stop()
    this.discv5.removeAllListeners()
    await this.removeAllListeners()
    await this.db.close()
    for (const network of this.networks.values()) {
      network.stopRefresh()
    }
  }

  public network = (): {
    [NetworkId.HistoryNetwork]: HistoryNetwork | undefined
    [NetworkId.StateNetwork]: StateNetwork | undefined
    [NetworkId.BeaconChainNetwork]: BeaconLightClientNetwork | undefined
  } => {
    const history = this.networks.get(NetworkId.HistoryNetwork)
      ? (this.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork)
      : undefined
    const state = this.networks.get(NetworkId.StateNetwork)
      ? (this.networks.get(NetworkId.StateNetwork) as StateNetwork)
      : undefined
    const beacon = this.networks.get(NetworkId.BeaconChainNetwork)
      ? (this.networks.get(NetworkId.BeaconChainNetwork) as BeaconLightClientNetwork)
      : undefined
    return {
      [NetworkId.HistoryNetwork]: history,
      [NetworkId.StateNetwork]: state,
      [NetworkId.BeaconChainNetwork]: beacon,
    }
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
    for (const network of this.networks) {
      for (const enr of network[1].routingTable.values()) {
        peers.push(enr.encodeTxt())
      }
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
          value: bytesToHex(this.discv5.enr.privateKey!),
        },
        {
          type: 'put',
          key: 'publicKey',
          value: bytesToHex(this.discv5.enr.publicKey!),
        },
        {
          type: 'put',
          key: 'peers',
          value: JSON.stringify(peers),
        },
      ])
    } catch (err: any) {
      this.logger.log('error: ', err.message)
    }
  }

  private onTalkReq = async (src: INodeAddress, sourceId: ENR | null, message: ITalkReqMessage) => {
    this.metrics?.totalBytesReceived.inc(message.request.length)
    if (bytesToHex(message.protocol) === NetworkId.UTPNetwork) {
      await this.handleUTP(src, src.nodeId, message, message.request)
      return
    }
    const network = this.networks.get(bytesToHex(message.protocol) as NetworkId)
    if (!network) {
      this.logger(`Received TALKREQ message on unsupported network ${bytesToHex(message.protocol)}`)
      await this.sendPortalNetworkResponse(src, message.id, new Uint8Array())

      return
    }

    await network.handle(message, src)
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
    try {
      await this.uTP.handleUtpPacket(packetBuffer, srcId)
    } catch (err: any) {
      this.logger(err.message)
    }
  }

  /**
   *
   * @param dstId `NodeId` of message recipient
   * @param payload `Uint8Array` serialized payload of message
   * @param networkId subnetwork ID of subnetwork message is being sent on
   * @returns response from `dstId` as `Uint8Array` or empty array
   */
  public sendPortalNetworkMessage = async (
    enr: ENR | string,
    payload: Uint8Array,
    networkId: NetworkId,
    utpMessage?: boolean,
  ): Promise<Uint8Array> => {
    const messageNetwork = utpMessage !== undefined ? NetworkId.UTPNetwork : networkId
    try {
      this.metrics?.totalBytesSent.inc(payload.length)
      let nodeAddr: ENR | undefined
      if (typeof enr === 'string') {
        // If ENR is not provided, look up ENR in network routing table by nodeId
        const network = this.networks.get(networkId)
        if (network) {
          nodeAddr = network.routingTable.getWithPending(enr)?.value
          if (!nodeAddr) {
            // Check in unverified sessions cache if no ENR found in routing table
            // nodeAddr = this.unverifiedSessionCache.get(enr)
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
        hexToBytes(messageNetwork),
      )
      this.eventLog &&
        this.emit('SendTalkReq', nodeAddr.nodeId, bytesToHex(res), bytesToHex(payload))
      return res
    } catch (err: any) {
      if (networkId === NetworkId.UTPNetwork) {
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
    this.eventLog &&
      this.emit('SendTalkResp', src.nodeId, requestId.toString(16), bytesToHex(payload))
    await this.discv5.sendTalkResp(src, requestId, payload)
  }
}
