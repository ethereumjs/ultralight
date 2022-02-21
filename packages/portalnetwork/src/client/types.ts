import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import EventEmitter from 'events'
import { NodeId } from '@chainsafe/discv5'
import { SubNetworkIds } from '..'

export interface IPortalNetworkEvents {
  Stream: (connectionId: number, content: Uint8Array) => void
  NodeAdded: (nodeId: NodeId, networkId: SubNetworkIds) => void
  NodeRemoved: (nodeId: NodeId, networkId: SubNetworkIds) => void
  ContentAdded: (key: string, contentType: number, content: string) => void
}

export type PortalNetworkEventEmitter = StrictEventEmitter<EventEmitter, IPortalNetworkEvents>

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
}
