import { UtpSocket } from '..'
import { HistoryNetworkContentKey, HistoryNetworkContentKeyUnionType } from '../../..'
import ContentReader from '../Protocol/read/ContentReader'
import ContentWriter from '../Protocol/write/ContentWriter'
import { sendSynPacket } from '../Packets/PacketSenders'
import { RequestCode } from './PortalNetworkUTP'
import { ConnectionState } from '../Socket'

export type ContentRequest = HistoryNetworkContentRequest // , StateNetwork..., etc...

export class HistoryNetworkContentRequest {
  requestCode: RequestCode
  contentKey: HistoryNetworkContentKey
  contentKeys: HistoryNetworkContentKey[]
  socket: UtpSocket
  sockets: UtpSocket[]
  socketKey: string
  content?: Uint8Array
  reader?: ContentReader
  writer?: ContentWriter

  constructor(
    requestCode: RequestCode,
    contentKey: Uint8Array[],
    socket: UtpSocket[],
    socketKey: string,
    content: Uint8Array[] | undefined[]
  ) {
    this.sockets = socket
    //@ts-ignore
    this.contentKeys = contentKey.map((k) => {
      return HistoryNetworkContentKeyUnionType.deserialize(Uint8Array.from(k))
    })
    this.requestCode = requestCode
    this.contentKey = this.contentKeys[0]
    this.content = content[0]
    this.socketKey = socketKey
    this.socket = this.sockets[0]
  }

  async init(): Promise<void> {
    let writer
    switch (this.requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
        break
      case RequestCode.FINDCONTENT_READ:
        await sendSynPacket(this.socket)
        break
      case RequestCode.OFFER_WRITE:
        this.socket = this.sockets.pop()!
        this.contentKey = this.contentKeys.pop()!
        writer = await this.socket!.utp.createNewWriter(this.socket, 2)
        this.writer = writer
        await sendSynPacket(this.socket)
        this.socket.state = ConnectionState.SynSent
        break
      case RequestCode.ACCEPT_READ:
        break
    }
  }
}
