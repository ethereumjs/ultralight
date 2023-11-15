import type { PortalNetworkRoutingTable } from './routingTable.js'
import type { NetworkId, StateNetworkRoutingTable } from '../index.js'
import type { IDiscv5CreateOptions, NodeId } from '@chainsafe/discv5'
import type { AbstractLevel } from 'abstract-level'
import type EventEmitter from 'events'
import type StrictEventEmitter from 'strict-event-emitter-types/types/src'

export interface IPortalNetworkEvents {
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

export interface PortalNetworkOpts {
  supportedNetworks?: NetworkId[]
  radius?: bigint
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
}

export type PortalNetworkEventEmitter = StrictEventEmitter<EventEmitter, IPortalNetworkEvents>

export type RoutingTable = PortalNetworkRoutingTable | StateNetworkRoutingTable
interface IGauge {
  inc(value?: number): void
  set(value: number): void
  collect?(): void
}

interface ICounter {
  inc(value?: number): void
}
export interface PortalNetworkMetrics {
  totalContentLookups: ICounter
  knownHistoryNodes: IGauge
  knownDiscv5Nodes: IGauge
  successfulContentLookups: ICounter
  failedContentLookups: ICounter
  offerMessagesSent: ICounter
  offerMessagesReceived: ICounter
  acceptMessagesSent: ICounter
  acceptMessagesReceived: ICounter
  findContentMessagesSent: ICounter
  findContentMessagesReceived: ICounter
  contentMessagesSent: ICounter
  contentMessagesReceived: ICounter
  findNodesMessagesSent: ICounter
  findNodesMessagesReceived: ICounter
  nodesMessagesSent: ICounter
  nodesMessagesReceived: ICounter
  totalBytesReceived: ICounter
  totalBytesSent: ICounter
  currentDBSize: IGauge
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
