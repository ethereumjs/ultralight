import { UtpSocket } from '..'
import ContentReader from '../Protocol/read/ContentReader'
import ContentWriter from '../Protocol/write/ContentWriter'
import { sendSynPacket } from './PacketSenders'
import { RequestCode } from './PortalNetworkUTP'

export type ContentRequest = HistoryNetworkContentRequest // , StateNetwork..., etc...

export class HistoryNetworkContentRequest {
  requestCode: RequestCode
  contentKey: Uint8Array
  socket: UtpSocket
  socketKey: string
  content?: Uint8Array
  reader?: ContentReader
  writer?: ContentWriter

  constructor(
    requestCode: RequestCode,
    contentKey: Uint8Array,
    socket: UtpSocket,
    socketKey: string,
    content?: Uint8Array
  ) {
    this.requestCode = requestCode
    this.contentKey = contentKey
    this.content = content
    this.socketKey = socketKey
    this.socket = socket
  }

  async init(): Promise<void> {
    switch (this.requestCode) {
      case 0:
        await sendSynPacket(this.socket)
        break
      case 1:
        break
      case 2:
        break
      case 3:
        await sendSynPacket(this.socket)
        break
    }
  }
}
