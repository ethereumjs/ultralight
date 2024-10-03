import { RequestCode } from './types.js'

import type { NetworkId } from '../../../index.js'
import type { UtpSocket } from '../index.js'

export interface ContentRequestOptions {
  networkId: NetworkId
  requestCode: RequestCode
  socket: UtpSocket
  socketKey: string
  contentKeys: Uint8Array[]
  content: Uint8Array
}
export abstract class ContentRequest {
  networkId: NetworkId
  requestCode: RequestCode
  socket: UtpSocket
  socketKey: string
  constructor(options: ContentRequestOptions) {
    this.networkId = options.networkId
    this.requestCode = options.requestCode
    this.socketKey = options.socketKey
    this.socket = options.socket
  }

  abstract init(): Promise<void>

  close(): void {
    this.socket.close()
  }
}

export class FindContentReadRequest extends ContentRequest {
  requestCode: RequestCode.FINDCONTENT_READ
  contentKey: Uint8Array
  constructor(options: ContentRequestOptions) {
    super(options)
    this.requestCode = RequestCode.FINDCONTENT_READ
    this.contentKey = options.contentKeys[0]
  }
  async init(): Promise<void> {
    this.socket.logger.extend('ContentRequest')('init() - Sending a SYN')
    await this.socket.sendSynPacket(this.socket.sndConnectionId)
  }
}

export class FoundContentWriteRequest extends ContentRequest {
  requestCode: RequestCode.FOUNDCONTENT_WRITE
  content: Uint8Array
  contentKey: Uint8Array
  constructor(options: ContentRequestOptions) {
    super(options)
    this.requestCode = RequestCode.FOUNDCONTENT_WRITE
    this.content = options.content
    this.contentKey = options.contentKeys[0]
  }
  async init(): Promise<void> {
    this.socket.logger.extend('ContentRequest')('init() - awaiting a SYN')
  }
}

export class AcceptReadRequest extends ContentRequest {
  requestCode: RequestCode.ACCEPT_READ
  contentKeys: Uint8Array[]
  constructor(options: ContentRequestOptions) {
    super(options)
    this.requestCode = RequestCode.ACCEPT_READ
    this.contentKeys = options.contentKeys
  }
  async init(): Promise<void> {
    this.socket.logger.extend('ContentRequest')('init() - awaiting a SYN')
  }
}

export class OfferWriteRequest extends ContentRequest {
  requestCode: RequestCode.OFFER_WRITE
  content: Uint8Array
  contentKeys: Uint8Array[]
  constructor(options: ContentRequestOptions) {
    super(options)
    this.requestCode = RequestCode.OFFER_WRITE
    this.content = options.content
    this.contentKeys = options.contentKeys
  }

  async init(): Promise<void> {
    this.socket.logger.extend('ContentRequest')('init() - Sending a SYN')
    await this.socket.sendSynPacket(this.socket.sndConnectionId)
  }
}

export type ContentRequestType =
  | FindContentReadRequest
  | FoundContentWriteRequest
  | OfferWriteRequest
  | AcceptReadRequest

export function createContentRequest(options: ContentRequestOptions): ContentRequestType {
  switch (options.requestCode) {
    case RequestCode.FINDCONTENT_READ:
      return new FindContentReadRequest(options)
    case RequestCode.FOUNDCONTENT_WRITE:
      return new FoundContentWriteRequest(options)
    case RequestCode.OFFER_WRITE:
      return new OfferWriteRequest(options)
    case RequestCode.ACCEPT_READ:
      return new AcceptReadRequest(options)
  }
}
