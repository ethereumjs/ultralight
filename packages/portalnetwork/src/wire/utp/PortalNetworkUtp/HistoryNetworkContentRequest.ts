import { UtpSocket } from '..'
import Reader from '../Protocol/read/Reader'
import Writer from '../Protocol/write/Writer'
import { sendSynPacket } from './PacketSenders'
import { RequestCode } from './portalnetworkutp'

export type ContentRequest = HistoryNetworkContentRequest // , StateNetwork..., etc...

export class HistoryNetworkContentRequest {
  requestCode: RequestCode
  contentKey: Uint8Array
  content: Uint8Array | undefined
  socketKey: string | undefined
  socket: UtpSocket
  reader: Reader | undefined
  writer: Writer | undefined

  constructor(
    requestCode: RequestCode,
    contentKey: Uint8Array,
    content: Uint8Array | undefined,
    socketKey: string | undefined,
    socket: UtpSocket
  ) {
    this.requestCode = requestCode
    this.contentKey = contentKey
    this.content = content
    this.socketKey = socketKey
    this.socket = socket
  }

  init(): void {
    switch (this.requestCode) {
      case 0:
        sendSynPacket(this.socket)
        break
      case 1:
        break
      case 2:
        break
      case 3:
        sendSynPacket(this.socket)
        break
    }
  }
}
