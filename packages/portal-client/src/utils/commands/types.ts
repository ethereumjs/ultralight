export interface TransportProvider {
  initializePortal(): Promise<void>
  shutdownPortal(): Promise<void>
  sendCommand(message: any): Promise<any>
}

export interface RequestOptions {
  method: string
  params: any[]
}

export interface PortalRequest {
  method: string
  params?: any
}
