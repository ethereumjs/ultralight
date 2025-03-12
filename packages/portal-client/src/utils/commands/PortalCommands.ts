/// <reference types="@tauri-apps/api" />

import { TauriTransport } from './TauriTransport'
import { PortalRequest, TransportProvider } from './types'

declare global {
  interface Window {
    __TAURI__?: any
  }
}
export class PortalCommands {
  private transport: TransportProvider

  constructor() {
    this.transport = window.__TAURI__ ?? new TauriTransport()
  }

  async initialize(): Promise<void> {
    await this.transport.initializePortal()
  }

  async shutdown(): Promise<void> {
    await this.transport.shutdownPortal()
  }

  async sendRequest(request: PortalRequest): Promise<any> {
    const { method, params } = request
    if (window.__TAURI__) {
      return (this.transport as TauriTransport).sendCommand(method, params)
    }
  }
}
