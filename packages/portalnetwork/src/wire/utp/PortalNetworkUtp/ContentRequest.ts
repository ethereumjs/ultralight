import { UtpSocket, ConnectionState } from '../index.js'
import { ProtocolId } from '../../../index.js'
import { RequestCode } from './types.js'

export interface ContentRequestOptions<P extends ProtocolId> {
  protocolId: ProtocolId
  requestCode: RequestCode
  socket: UtpSocket<P>
  socketKey: string
  contentKeys: Uint8Array[]
  content?: Uint8Array
}
export class ContentRequest<P extends ProtocolId> {
  protocolId: ProtocolId
  requestCode: RequestCode
  contentKey?: Uint8Array
  contentKeys: Uint8Array[]
  socket: UtpSocket<P>
  socketKey: string
  content?: Uint8Array

  constructor(options: ContentRequestOptions<P>) {
    this.protocolId = options.protocolId
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
    this.content = Uint8Array.from([])
    this.socket.close()
  }

  async sendSyn(): Promise<void> {
    await this.socket.sendSynPacket()
    this.socket.state = ConnectionState.SynSent
  }
}
