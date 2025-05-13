import type { BindAddrs, IDiscv5CreateOptions } from '@chainsafe/discv5'
import type { NodeId } from '@chainsafe/enr'
import type { AbstractLevel } from 'abstract-level'

import type { ITransportService } from '@chainsafe/discv5'
import { ListBasicType, UintNumberType } from '@chainsafe/ssz'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { NetworkId } from '../index.js'
import type { IRateLimiter } from '../transports/rateLimiter.js'
import type { PortalNetworkRoutingTable } from './routingTable.js'

/** A representation of an unsigned contactable node. */
export interface INodeAddress {
  /** The destination socket address. */
  socketAddr: Multiaddr
  /** The destination Node Id. */
  nodeId: NodeId
}

export interface PortalNetworkEvents {
  NodeAdded: (nodeId: NodeId, networkId: NetworkId) => void
  NodeRemoved: (nodeId: NodeId, networkId: NetworkId) => void
  ContentAdded: (key: Uint8Array, contentType: number, content: string) => void
  Verified: (key: Uint8Array, verified: boolean) => void
  SendTalkReq: (nodeId: string, requestId: string, payload: string) => void
  SendTalkResp: (nodeId: string, requestId: string, payload: string) => void
}

export enum TransportLayer {
  NODE = 'node',
  WEB = 'web',
  MOBILE = 'mobile',
  TAURI = 'tauri',
}

export interface TransportServices {
  createTauriTransport?: (
    bindAddr: Multiaddr,
    nodeId: string,
    rateLimiter?: IRateLimiter,
  ) => ITransportService

  createWebSocketTransport?: (
    bindAddr: Multiaddr,
    nodeId: string,
    proxyAddress: string,
    rateLimiter?: IRateLimiter,
  ) => ITransportService

  createNodeTransport?: (
    bindAddrs: BindAddrs,
    nodeId: string,
    rateLimiter?: IRateLimiter,
  ) => ITransportService
}
export interface NetworkConfig {
  networkId: NetworkId
  maxStorage?: number
  db?: {
    db: AbstractLevel<string, string>
    path: string
  }
}

export enum ChainId {
  Mainnet = '0x500',
  Sepolia = '0x505',
  AngelFood = '0x504',
}

export interface PortalNetworkOpts {
  chainId?: ChainId
  shortCommit?: string
  operatingSystemAndCpuArchitecture?: string
  supportedNetworks?: NetworkConfig[]
  bootnodes?: string[]
  db?: AbstractLevel<string, string> | undefined
  metrics?: PortalNetworkMetrics
  bindAddress?: string
  transport?: TransportLayer
  proxyAddress?: string
  rebuildFromMemory?: boolean
  config: Partial<IDiscv5CreateOptions>
  dataDir?: string
  dbSize(dir: string): Promise<number>
  trustedBlockRoot?: string
  eventLog?: boolean
  utpTimeout?: number
  shouldRefresh?: boolean
  gossipCount?: number
  supportedVersions?: number[]
  transportServices?: TransportServices
}

export type RoutingTable = PortalNetworkRoutingTable
interface Gauge {
  inc(value?: number): void
  set(value: number): void
  collect?(): void
}

interface Counter {
  inc(value?: number): void
}
export interface PortalNetworkMetrics {
  totalContentLookups: Counter
  knownHistoryNodes: Gauge
  knownDiscv5Nodes: Gauge
  successfulContentLookups: Counter
  failedContentLookups: Counter
  offerMessagesSent: Counter
  offerMessagesReceived: Counter
  acceptMessagesSent: Counter
  acceptMessagesReceived: Counter
  findContentMessagesSent: Counter
  findContentMessagesReceived: Counter
  contentMessagesSent: Counter
  contentMessagesReceived: Counter
  findNodesMessagesSent: Counter
  findNodesMessagesReceived: Counter
  nodesMessagesSent: Counter
  nodesMessagesReceived: Counter
  totalBytesReceived: Counter
  totalBytesSent: Counter
  currentDBSize: Gauge
}

/** Borrowed from @ethereumjs/client type definitions
 * https://github.com/ethereumjs/ethereumjs-monorepo/blob/8384cd445e7f16f527a55a48d23eaae51a3e3ba5/packages/client/src/rpc/types.ts#L1
 */
export interface RpcTx {
  from?: string
  to?: string
  gas?: string
  gasPrice?: string
  value?: string
  data?: string
  maxPriorityFeePerGas?: string
  maxFeePerGas?: string
  type?: string
}

export const ProtocolVersion = new UintNumberType(1)
export const SupportedVersions = new ListBasicType(ProtocolVersion, 8)
