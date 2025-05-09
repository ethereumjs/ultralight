import { UDPTransportService } from '@chainsafe/discv5'
import { SignableENR } from '@chainsafe/enr'
import { type PrefixedHexString, hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'

import { NetworkId } from '../networks/index.js'
import { RateLimiter } from '../transports/rateLimiter.js'
import { MEGABYTE } from '../util/index.js'
import { PortalNetwork } from './client.js'
import { TransportLayer } from './types.js'

import type { IDiscv5CreateOptions, ITransportService, SignableENRInput } from '@chainsafe/discv5'
import type { PortalNetworkOpts } from './types.js'

export async function createPortalNetwork(
  opts: Partial<PortalNetworkOpts>,
): Promise<PortalNetwork> {
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
    config.enr = SignableENR.decodeTxt(
      prevEnrString,
      hexToBytes(prevPrivateKey as PrefixedHexString),
    )
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
      dbSize = async () => {
        const sizeEstimate = await window.navigator.storage.estimate()
        return sizeEstimate.usage !== undefined ? sizeEstimate.usage / MEGABYTE : 0
      }
      break
    default:
      dbSize = opts.dbSize
  }

  let transportService: ITransportService

  if (opts.transportServices !== undefined) {
    switch (opts.transport) {
      case TransportLayer.WEB:
        {
          if (opts.transportServices.createWebSocketTransport === undefined) {
            throw new Error('WebSocket transport service not provided')
          }
          const proxyAddress = opts.proxyAddress ?? 'ws://127.0.0.1:5050'
          transportService = opts.transportServices.createWebSocketTransport(
            ma,
            config.enr.nodeId,
            proxyAddress,
            new RateLimiter(),
          )
        }
        break
      case TransportLayer.TAURI:
        if (opts.transportServices.createTauriTransport === undefined) {
          throw new Error('Tauri transport service not provided')
        }
        transportService = opts.transportServices.createTauriTransport(ma, config.enr.nodeId)
        break
      default:
        if (opts.transportServices.createNodeTransport === undefined) {
          throw new Error('Node transport service not provided')
        }
        transportService = opts.transportServices.createNodeTransport(
          config.bindAddrs,
          config.enr.nodeId,
          new RateLimiter(),
        )
        break
    }
  } else {
    transportService = new UDPTransportService({
      bindAddrs: config.bindAddrs,
      nodeId: config.enr.nodeId,
      rateLimiter: new RateLimiter(),
    })
  }

  config.transport = transportService

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
    supportedVersions: opts.supportedVersions,
    transportServices: opts.transportServices,
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
