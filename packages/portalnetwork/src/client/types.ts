import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import EventEmitter from 'events'

export interface IPortalNetworkEvents {
  log: (msg: string) => void
  Stream: (connectionId: number, content: Uint8Array) => void
}

export type PortalNetworkEventEmitter = StrictEventEmitter<EventEmitter, IPortalNetworkEvents>
