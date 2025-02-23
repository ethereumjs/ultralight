/// <reference types="@tauri-apps/api" />
import { HTTPTransport } from './index'
import { PortalRequest, TransportProvider } from './types'

declare global {
  interface Window {
    __TAURI__?: any
  }
}
export class PortalCommands {
  private transport: TransportProvider

  constructor() {
    this.transport = window.__TAURI__
      ? new HTTPTransport('http://127.0.0.1:8080')
      // ? new TauriTransport()
      : new HTTPTransport('http://127.0.0.1:8080')
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
      return (this.transport as HTTPTransport).portalRequest(method, params) // Use api route to communicate for now.
      // return (this.transport as TauriTransport).sendCommand(method, params)
    } else {
      return (this.transport as HTTPTransport).portalRequest(method, params)
    }
  }
}
