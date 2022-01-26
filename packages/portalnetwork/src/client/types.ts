import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import EventEmitter from 'events'
import { NodeId } from '@chainsafe/discv5'
import { SubNetworkIds } from '..'

export interface IPortalNetworkEvents {
  Stream: (connectionId: number, content: Uint8Array) => void
  NodeAdded: (nodeId: NodeId, networkId: SubNetworkIds) => void
  NodeRemoved: (nodeId: NodeId, networkId: SubNetworkIds) => void
  ContentAdded: (key: string, content: string) => void
}

export type PortalNetworkEventEmitter = StrictEventEmitter<EventEmitter, IPortalNetworkEvents>
