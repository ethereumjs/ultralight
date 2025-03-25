

import { keys } from '@libp2p/crypto'
import { hexToBytes } from '@ethereumjs/util'
import { multiaddr } from '@multiformats/multiaddr'
import { SignableENR } from '@chainsafe/enr'
import { UDPTransportService } from '@chainsafe/discv5'

import { NetworkId } from '../networks/index.js'
import { CapacitorUDPTransportService, WebSocketTransportService } from '../transports/index.js'
import { RateLimiter } from '../transports/rateLimiter.js'
import { MEGABYTE } from '../util/index.js'
import { TransportLayer } from './types.js'
import { PortalNetwork } from './client.js'

import type { IDiscv5CreateOptions, SignableENRInput } from '@chainsafe/discv5'
import type { PortalNetworkOpts } from './types.js'

export async function createPortalNetwork(opts: Partial<PortalNetworkOpts>): Promise<PortalNetwork> {
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
  config.config = { ...defaultConfig.config, ...opts.config?.config }
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
        const sizeEstimate = await window.navigator.storage.estimate()
        return sizeEstimate.usage !== undefined ? sizeEstimate.usage / MEGABYTE : 0
      }
      break
    case TransportLayer.NODE:
    default:
      dbSize = opts.dbSize
  }
  
  // Configure transport layer
  switch (opts.transport) {
    case TransportLayer.WEB: {
      opts.proxyAddress = opts.proxyAddress ?? 'ws://127.0.0.1:5050'
      config.transport = new WebSocketTransportService(
        ma,
        config.enr.nodeId,
        opts.proxyAddress,
        new RateLimiter(),
      )
      break
    }
    case TransportLayer.MOBILE:
      config.transport = new CapacitorUDPTransportService(ma, config.enr.nodeId)
      break
    case TransportLayer.NODE:
      config.transport = new UDPTransportService({
        bindAddrs: config.bindAddrs,
        nodeId: config.enr.nodeId,
        rateLimiter: new RateLimiter(),
      })
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
    gossipCount: opts.gossipCount,
    shouldRefresh: opts.shouldRefresh,
    operatingSystemAndCpuArchitecture: opts.operatingSystemAndCpuArchitecture,
    shortCommit: opts.shortCommit,
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