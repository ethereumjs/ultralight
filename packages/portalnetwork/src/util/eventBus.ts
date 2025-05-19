import { EventEmitter } from 'eventemitter3'
import type { PortalNetworkEvents } from '../index.js'

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