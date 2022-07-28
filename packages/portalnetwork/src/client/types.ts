import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import EventEmitter from 'events'
import { IDiscv5CreateOptions, NodeId } from '@chainsafe/discv5'
import { StateNetworkRoutingTable, ProtocolId } from '../index.js'
import { PortalNetworkRoutingTable } from './routingTable.js'
import { AbstractLevel } from 'abstract-level'

export interface IPortalNetworkEvents {
  NodeAdded: (nodeId: NodeId, protocolId: ProtocolId) => void
  NodeRemoved: (nodeId: NodeId, protocolId: ProtocolId) => void
  ContentAdded: (key: string, contentType: number, content: string) => void
}

export enum TransportLayer {
  NODE = 'node',
  WEB = 'web',
  MOBILE = 'mobile',
}

export interface PortalNetworkOpts {
  supportedProtocols: ProtocolId[]
  radius?: bigint
  bootnodes?: string[]
  db?: AbstractLevel<string, string> | undefined
  metrics?: PortalNetworkMetrics
  bindAddress?: string
  transport?: TransportLayer
  proxyAddress?: string
  rebuildFromMemory?: boolean
  config: IDiscv5CreateOptions
  dataDir?: string
  dbSize(): Promise<number>
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

export type Log = [address: Buffer, topics: Buffer[], data: Buffer]

export type TxReceipt = PreByzantiumTxReceipt | PostByzantiumTxReceipt

/**
 * Abstract interface with common transaction receipt fields
 */
export interface BaseTxReceipt {
  /**
   * Cumulative gas used in the block including this tx
   */
  cumulativeBlockGasUsed: bigint
  /**
   * Bloom bitvector
   */
  bitvector: Buffer
  /**
   * Logs emitted
   */
  logs: Log[]
}

/**
 * Pre-Byzantium receipt type with a field
 * for the intermediary state root
 */
export interface PreByzantiumTxReceipt extends BaseTxReceipt {
  /**
   * Intermediary state root
   */
  stateRoot: Buffer
}

/**
 * Receipt type for Byzantium and beyond replacing the intermediary
 * state root field with a status code field (EIP-658)
 */
export interface PostByzantiumTxReceipt extends BaseTxReceipt {
  /**
   * Status of transaction, `1` if successful, `0` if an exception occured
   */
  status: 0 | 1
}
