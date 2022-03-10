import { Union } from '@chainsafe/ssz'
import { UtpSocket } from '..'
import { HistoryNetworkContentKey, HistoryNetworkContentKeyUnionType } from '../../..'
import ContentReader from '../Protocol/read/ContentReader'
import ContentWriter from '../Protocol/write/ContentWriter'
import { sendSynPacket } from '../Packets/PacketSenders'
import { RequestCode } from './PortalNetworkUTP'

export type ContentRequest = HistoryNetworkContentRequest // , StateNetwork..., etc...

export class HistoryNetworkContentRequest {
  requestCode: RequestCode
  contentKey: Union<HistoryNetworkContentKey>
  socket: UtpSocket
  socketKey: string
  content?: Uint8Array
  reader?: ContentReader
  writer?: ContentWriter

  constructor(
    requestCode: RequestCode,
    contentKey: Uint8Array[],
    socket: UtpSocket,
    socketKey: string,
    content: Uint8Array[] | undefined[]
  ) {
    this.requestCode = requestCode
    this.contentKey = HistoryNetworkContentKeyUnionType.deserialize(Uint8Array.from(contentKey[0]))
    this.content = content[0] ?? undefined
    this.socketKey = socketKey
    this.socket = socket
  }
  async init(): Promise<void> {
    let writer
    switch (this.requestCode) {
      case 0:
        break
      case 1:
        await sendSynPacket(this.socket)
        break
      case 2:
        writer = await this.socket.utp.createNewWriter(this.socket, 2)
        this.writer = writer
        await sendSynPacket(this.socket)
        break
      case 3:
        break
    }
  }
}
