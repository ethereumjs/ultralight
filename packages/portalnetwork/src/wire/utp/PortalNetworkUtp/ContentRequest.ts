import { ConnectionState } from '../index.js'

import { RequestCode } from './types.js'

import type { NetworkId } from '../../../index.js'
import type { UtpSocket } from '../index.js'

export interface ContentRequestOptions {
  networkId: NetworkId
  requestCode: RequestCode
  socket: UtpSocket
  socketKey: string
  contentKeys: Uint8Array[]
  content?: Uint8Array
}
export class ContentRequest {
  networkId: NetworkId
  requestCode: RequestCode
  contentKey?: Uint8Array
  contentKeys: Uint8Array[]
  socket: UtpSocket
  socketKey: string
  content?: Uint8Array

  constructor(options: ContentRequestOptions) {
    this.networkId = options.networkId
    this.contentKeys = options.contentKeys
    this.requestCode = options.requestCode
    this.content = options.content
    this.socketKey = options.socketKey
    this.socket = options.socket
  }

  async init(): Promise<RequestCode> {
    switch (this.requestCode) {
      case RequestCode.FINDCONTENT_READ:
        this.socket.logger.extend('ContentRequest')('init() - Sending a SYN')
        await this.sendSyn()
        break
      case RequestCode.OFFER_WRITE:
        if (this.content) {
          this.socket.content = this.content
          this.socket.logger.extend('ContentRequest')('init() - Sending a SYN')
          await this.sendSyn()
        }
        break
      default:
        this.socket.logger.extend('ContentRequest')('init() - Waiting for a SYN')
        break
    }
    return this.requestCode
  }

  close(): void {
    this.socket.close()
  }

  async sendSyn(): Promise<void> {
    await this.socket.sendSynPacket(this.socket.sndConnectionId)
    this.socket.state = ConnectionState.SynSent
  }
}
