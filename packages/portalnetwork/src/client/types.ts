import StrictEventEmitter from "strict-event-emitter-types/types/src";
import EventEmitter from 'events'

export interface IPortalNetworkEvents {
    log: (msg: string) => void
}

export type PortalNetworkEventEmitter = StrictEventEmitter<EventEmitter, IPortalNetworkEvents>