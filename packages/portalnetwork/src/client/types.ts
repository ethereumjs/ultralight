import type { PortalNetworkRoutingTable } from './routingTable.js'
import type { NetworkId, StateNetworkRoutingTable } from '../index.js'
import type { IDiscv5CreateOptions } from '@chainsafe/discv5'
import type { NodeId } from '@chainsafe/enr'
import type { AbstractLevel } from 'abstract-level'
import type EventEmitter from 'events'
import type StrictEventEmitter from 'strict-event-emitter-types/types/src'

export interface PortalNetworkEvents {
  NodeAdded: (nodeId: NodeId, networkId: NetworkId) => void
  NodeRemoved: (nodeId: NodeId, networkId: NetworkId) => void
  ContentAdded: (key: string, contentType: number, content: string) => void
  Verified: (key: string, verified: boolean) => void
  SendTalkReq: (nodeId: string, requestId: string, payload: string) => void
  SendTalkResp: (nodeId: string, requestId: string, payload: string) => void
}

export enum TransportLayer {
  NODE = 'node',
  WEB = 'web',
  MOBILE = 'mobile',
}

export interface NetworkConfig {
  networkId: NetworkId
  maxStorage?: number
  db?: {
    db: AbstractLevel<string, string>
    path: string
  }
}

export interface PortalNetworkOpts {
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
  dbSize(): Promise<number>
  trustedBlockRoot?: string
  eventLog?: boolean
  utpTimeout?: number
}

export type PortalNetworkEventEmitter = StrictEventEmitter<EventEmitter, PortalNetworkEvents>

export type RoutingTable = PortalNetworkRoutingTable | StateNetworkRoutingTable
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
