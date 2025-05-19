import { EventEmitter } from 'eventemitter3'
import type { NetworkId } from '../index.js'

type NodeId = string

type ContentAddedEventName = `${NetworkId}:ContentAdded`
type ContentAddedEventType = (key: Uint8Array, content: Uint8Array) => Promise<void | { content: Uint8Array; utp: boolean }>
type ContentAddedEvents = {
  [K in ContentAddedEventName]: ContentAddedEventType
}

type NodeAddedEventName = `${NetworkId}:NodeAdded`
type NodeAddedEventType = (nodeId: NodeId) => void
type NodeAddedEvents = {
  [K in NodeAddedEventName]: NodeAddedEventType
}

type NodeRemovedEventName = `${NetworkId}:NodeRemoved`
type NodeRemovedEventType = (nodeId: NodeId) => void
type NodeRemovedEvents = {
  [K in NodeRemovedEventName]: NodeRemovedEventType
}

type NetworkEvents = ContentAddedEvents & NodeAddedEvents & NodeRemovedEvents

export interface PortalNetworkEvents extends NetworkEvents {
  Verified: (key: Uint8Array, verified: boolean) => void
  SendTalkReq: (nodeId: string, requestId: string, payload: string) => void
  SendTalkResp: (nodeId: string, requestId: string, payload: string) => void
}


export class EventBus extends EventEmitter<PortalNetworkEvents> {
  private static instance: EventBus

  private constructor() {
    super()
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }
 
}