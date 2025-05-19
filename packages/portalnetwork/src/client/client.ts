import { Discv5 } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import type { Multiaddr } from '@multiformats/multiaddr'
import { fromNodeAddress } from '@multiformats/multiaddr'
import debug from 'debug'
import packageJson from '../../package.json' with { type: 'json' }

import { HistoryNetwork } from '../networks/history/history.js'
import { NetworkId, type SubNetwork } from '../networks/index.js'
import { PortalNetworkUTP } from '../wire/utp/PortalNetworkUtp/index.js'
import { EventBus } from '../util/eventBus.js'

import { DBManager } from './dbManager.js'
import { ETH } from './eth.js'
import { SupportedVersions } from './types.js'

import type { IDiscv5CreateOptions } from '@chainsafe/discv5'
import type { ITalkReqMessage, ITalkRespMessage } from '@chainsafe/discv5/message'
import type { Debugger } from 'debug'
import type { BaseNetwork } from '../networks/network.js'
import type { RateLimiter } from '../transports/rateLimiter.js'
import type { IClientInfo } from '../wire/payloadExtensions.js'
import type { Version } from '../wire/types.js'
import { MessageCodes, PortalWireMessageType } from '../wire/types.js'
import { ENRCache } from './enrCache.js'
import {
  ChainId,
  type INodeAddress,
  type PortalNetworkMetrics,
  type PortalNetworkOpts,
} from './types.js'
import { createNetwork } from '../networks/constructor.js'

export class PortalNetwork {
  clientInfo: IClientInfo
  eventLog: boolean
  eventBus: EventBus
  discv5: Discv5
  chainId: ChainId
  networks: Map<NetworkId, BaseNetwork>
  uTP: PortalNetworkUTP
  utpTimout: number
  db: DBManager
  bootnodes: string[]
  metrics: PortalNetworkMetrics | undefined
  logger: Debugger
  ETH: ETH
  enrCache: ENRCache
  shouldRefresh = true

  /**
   *
   * Portal Network constructor
   * @param opts a dictionary of `PortalNetworkOpts`
   */
  constructor(opts: PortalNetworkOpts) {
    this.eventBus = EventBus.getInstance()
    this.chainId = opts.chainId ?? ChainId.MAINNET
    this.clientInfo = {
      clientName: 'ultralight',
      clientVersionAndShortCommit: `${packageJson.version}-${opts.shortCommit ?? ''}`,
      operatingSystemAndCpuArchitecture: opts.operatingSystemAndCpuArchitecture ?? '',
      programmingLanguageAndVersion: `typescript_${packageJson.devDependencies.typescript}`,
    }
    this.eventLog = opts.eventLog ?? false
    this.discv5 = Discv5.create(opts.config as IDiscv5CreateOptions)
    // cache signature to ensure ENR can be encoded on startup
    this.discv5.enr.encode()
    this.discv5.enr.set('pv', SupportedVersions.serialize(opts.supportedVersions ?? [0]))
    this.enrCache = new ENRCache({})
    this.logger = debug(this.discv5.enr.nodeId.slice(0, 5)).extend('Portal')
    this.networks = new Map()
    this.bootnodes = opts.bootnodes ?? []
    this.uTP = new PortalNetworkUTP(this)
    this.utpTimout = opts.utpTimeout ?? 180000 // set default utpTimeout to 3 minutes
    this.db = new DBManager(
      this.discv5.enr.nodeId,
      this.logger,
      async () => opts.dbSize(opts.dataDir ?? './'),
      opts.db,
    )
    opts.supportedNetworks = opts.supportedNetworks ?? []
    for (const network of opts.supportedNetworks) {
      try {
        const networkInstance = createNetwork(network.networkId, {
          client: this,
          maxStorage: network.maxStorage,
          db: network.db,
          gossipCount: opts.gossipCount,
          dbSize: (dir: string) => opts.dbSize(dir),
          trustedBlockRoot: opts.trustedBlockRoot ? hexToBytes(opts.trustedBlockRoot as `0x${string}`) : undefined,
          dataDir: opts.dataDir,
        })
        this.networks.set(network.networkId, networkInstance)
      } catch (err: any) {
        this.logger.extend('error')(
          `Failed to initialize network ${network.networkId}: ${err.message}`,
        )
      }
    }
    for (const network of this.networks.values()) {
      this.db.sublevels.set(network.networkId, network.db)
    }

    this.ETH = new ETH(this)

    // Set version info pair in ENR
    this.discv5.enr.set('c', new TextEncoder().encode('u 0.0.1'))
    // Event handling
    this.discv5.on('talkReqReceived', this.onTalkReq)
    this.discv5.on('talkRespReceived', this.onTalkResp)
    this.discv5.on('enrAdded', (enr: ENR) => {
      this.updateENRCache([enr])
    })
    this.discv5.on('discovered', (enr: ENR) => {
      this.updateENRCache([enr])
    })
    // if (this.discv5.sessionService.transport instanceof HybridTransportService) {
    //   ;(this.discv5.sessionService as any).send = this.send.bind(this)
    // }
    this.discv5.sessionService.on('established', async (nodeAddr, enr) => {
      this.discv5.findEnr(enr.nodeId) === undefined && this.discv5.addEnr(enr)
      this.updateENRCache([enr])
    })
    if (opts.metrics) {
      this.metrics = opts.metrics
      this.metrics.knownDiscv5Nodes.collect = () =>
        this.metrics?.knownDiscv5Nodes.set(this.discv5.kadValues().length)
      this.metrics.currentDBSize.collect = async () => {
        this.metrics?.currentDBSize.set(await this.db.currentSize())
      }
    }
    // Should refresh by default but can be disabled (e.g. in tests)
    opts.shouldRefresh === false && (this.shouldRefresh = false)
  }

  /**
   * Starts the portal network client
   */
  public start = async () => {
    await this.discv5.start()
    await this.db.open()
    const storedIndex = await this.db.getBlockIndex()
    await this.loadENRCache()
    for (const network of this.networks.values()) {
      try {
        // Check for stored radius in db
        const storedRadius = await network.db.db.get('radius')
        await network.setRadius(BigInt(storedRadius))
      } catch (err) {
        // No action
      }
      if (network instanceof HistoryNetwork) {
        network.blockHashIndex = storedIndex
      }
      this.shouldRefresh && network.startRefresh()
      await network.prune()
    }
    void this.bootstrap()
  }

  /**
   * Tries to connect to any pre-configured bootnodes
   */
  public bootstrap = async () => {
    const boostrapRequests = []
    for (const network of this.networks) {
      for (const enr of this.bootnodes) {
        boostrapRequests.push(network[1].addBootNode(enr))
      }
    }
    void Promise.all(boostrapRequests)
  }
  /**
   * Stops the portal network client and cleans up listeners
   */
  public stop = async () => {
    await this.discv5.stop()
    this.discv5.removeAllListeners()
    this.eventBus.removeAllListeners()
    await this.storeENRCache()
    await this.db.close()
    for (const network of this.networks.values()) {
      network.stopRefresh()
    }
  }

  public network(): Partial<Record<NetworkId, SubNetwork<NetworkId> | undefined>> {
    const networks: Partial<Record<NetworkId, SubNetwork<NetworkId> | undefined>> = {}
    for (const [networkId, network] of this.networks.entries()) {
      networks[networkId] = network as SubNetwork<NetworkId>
    }
    return networks
  }

  /**
   *
   * @param namespaces comma separated list of logging namespaces
   * defaults to "*Portal*,*uTP*"
   */
  public enableLog = (namespaces = '*Portal*,*uTP*,*discv5*') => {
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
          value: bytesToHex(this.discv5.enr.privateKey),
        },
        {
          type: 'put',
          key: 'publicKey',
          value: bytesToHex(this.discv5.enr.publicKey),
        },
        {
          type: 'put',
          key: 'peers',
          value: JSON.stringify(peers),
        },
      ])
    } catch (err: any) {
      this.logger.extend('error')(err.message)
    }
  }

  private onTalkReq = async (
    nodeAddress: INodeAddress,
    src: ENR | null,
    message: ITalkReqMessage,
  ) => {
    this.metrics?.totalBytesReceived.inc(message.request.length)
    if (bytesToHex(message.protocol) === NetworkId.UTPNetwork) {
      await this.handleUTP(nodeAddress, message, message.request)
      return
    }
    const network = this.networks.get(bytesToHex(message.protocol) as NetworkId)
    if (!network) {
      this.logger(`Received TALKREQ message on unsupported network ${bytesToHex(message.protocol)}`)
      await this.sendPortalNetworkResponse(nodeAddress, message.id, new Uint8Array())

      return
    }
    try {
      await network.handle(message, nodeAddress)
    } catch (err: any) {
      this.logger.extend('error')(
        `Error handling TALKREQ message from ${nodeAddress.nodeId}: ${err}.  `,
      )
      await this.sendPortalNetworkResponse(nodeAddress, message.id, new Uint8Array())
    }
  }

  private onTalkResp = (_: INodeAddress, src: ENR | null, message: ITalkRespMessage) => {
    this.metrics?.totalBytesReceived.inc(message.response.length)
  }

  /**
   *
   * @param srcId nodeID that uTP packet originates from
   * @param msgId uTP message ID
   * @param packetBuffer uTP packet encoded to Buffer
   */
  private handleUTP = async (src: INodeAddress, msg: ITalkReqMessage, packetBuffer: Uint8Array) => {
    await this.sendPortalNetworkResponse(src, msg.id, new Uint8Array())
    try {
      await this.uTP.handleUtpPacket(packetBuffer, src)
    } catch (err: any) {
      this.logger.extend('error')(
        `handleUTP error: ${err.message}.  SrcId: ${
          src.nodeId
        } MultiAddr: ${src.socketAddr.toString()}`,
      )
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
    enr: ENR | INodeAddress,
    payload: Uint8Array,
    networkId: NetworkId,
    utpMessage?: boolean,
    version: Version = 0,
  ): Promise<Uint8Array> => {
    const messageNetwork = utpMessage !== undefined ? NetworkId.UTPNetwork : networkId
    const remote =
      enr instanceof ENR
        ? enr
        : (this.findENR(enr.nodeId) ?? fromNodeAddress(enr.socketAddr.nodeAddress(), 'udp'))
    try {
      this.metrics?.totalBytesSent.inc(payload.length)
      const res = await this.discv5.sendTalkReq(remote, payload, hexToBytes(messageNetwork))
      this.eventLog && this.eventBus.emit('SendTalkReq', enr.nodeId, bytesToHex(res), bytesToHex(payload))
      return res
    } catch (err: any) {
      if (networkId === NetworkId.UTPNetwork || utpMessage === true) {
        throw new Error(
          `Error sending uTP TALKREQ message using ${enr instanceof ENR ? 'ENR' : 'MultiAddr'}: ${err.message}`,
        )
      } else {
        const messageType = PortalWireMessageType[version].deserialize(payload).selector
        throw new Error(
          `Error sending TALKREQ ${MessageCodes[messageType]} message using ${enr instanceof ENR ? 'ENR' : 'MultiAddr'}: ${err}.  NetworkId: ${networkId} NodeId: ${enr.nodeId} MultiAddr: ${enr instanceof ENR ? enr.getLocationMultiaddr('udp')?.toString() : enr.socketAddr.toString()}`,
        )
      }
    }
  }

  public sendPortalNetworkResponse = async (
    src: INodeAddress,
    requestId: Uint8Array,
    payload: Uint8Array,
  ) => {
    this.eventLog &&
      this.eventBus.emit('SendTalkResp', src.nodeId, bytesToHex(requestId), bytesToHex(payload))
    try {
      await this.discv5.sendTalkResp(src, requestId, payload)
    } catch (err: any) {
      this.logger.extend('error')(
        `Error sending TALKRESP message: ${err}.  SrcId: ${src.nodeId} MultiAddr: ${src.socketAddr.toString()}`,
      )
    }
  }

  public addToBlackList = (ma: Multiaddr) => {
    ;(<RateLimiter>(<any>this.discv5.sessionService.transport)['rateLimiter']).addToBlackList(
      ma.nodeAddress().address,
    )
  }

  public isBlackListed = (ma: Multiaddr) => {
    return (<RateLimiter>(<any>this.discv5.sessionService.transport)['rateLimiter']).isBlackListed(
      ma.nodeAddress().address,
    )
  }

  public removeFromBlackList = (ma: Multiaddr) => {
    ;(<RateLimiter>(<any>this.discv5.sessionService.transport)['rateLimiter']).removeFromBlackList(
      ma.nodeAddress().address,
    )
  }

  public updateENRCache = (enrs: ENR[]) => {
    for (const enr of enrs) {
      this.highestCommonVersion(enr)
        .catch((e: any) => {
          this.logger.extend('error')(e.message)
        })
        .finally(() => {
          this.enrCache.updateENR(enr)
        })
    }
  }

  public findENR = (nodeId: string): ENR | undefined => {
    return this.enrCache.getENR(nodeId) ?? this.discv5.findEnr(nodeId)
  }

  public storeENRCache = async () => {
    const cache = Array.from(this.enrCache['peers'].values())
      .filter((peer) => peer.enr !== undefined)
      .map((peer) => {
        return peer.enr!.encodeTxt()
      })
    await this.db.put('enr_cache', JSON.stringify(cache))
  }

  public loadENRCache = async () => {
    try {
      const storedEnrCache = await this.db.get('enr_cache')
      if (storedEnrCache) {
        const enrs = JSON.parse(storedEnrCache)
        for (const enr of enrs) {
          this.enrCache.updateENR(ENR.decodeTxt(enr))
        }
      }
    } catch {
      // No action
    }
  }
  public async highestCommonVersion(peer: ENR): Promise<Version> {
    const mySupportedVersions: number[] = SupportedVersions.deserialize(
      this.discv5.enr.kvs.get('pv')!,
    )
    const pv = peer.kvs.get('pv')
    if (pv === undefined) {
      return 0
    }
    const peerSupportedVersions: number[] = SupportedVersions.deserialize(pv)
    const highestCommonVersion = peerSupportedVersions
      .filter((v) => mySupportedVersions.includes(v))
      .sort((a, b) => b - a)[0]
    if (highestCommonVersion === undefined) {
      this.addToBlackList(peer.getLocationMultiaddr('udp')!)
      throw new Error(`No common version found with ${peer.nodeId}`)
    }
    return highestCommonVersion as Version
  }
}
