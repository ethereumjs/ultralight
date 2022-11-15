import { UtpSocket, ConnectionState, sendSynPacket, RequestCode } from '../index.js'
import { ProtocolId } from '../../../index.js'

export class ContentRequest {
  protocolId: ProtocolId
  requestCode: RequestCode
  contentKey?: Uint8Array
  contentKeys: Uint8Array[]
  socket: UtpSocket
  socketKey: string
  content: Uint8Array

  constructor(
    protocolId: ProtocolId,
    requestCode: RequestCode,
    socket: UtpSocket,
    socketKey: string,
    content: Uint8Array,
    contentKeys: Uint8Array[]
  ) {
    this.protocolId = protocolId
    this.contentKeys = contentKeys
    this.requestCode = requestCode
    this.content = content
    this.socketKey = socketKey
    this.socket = socket
  }

  async init(): Promise<RequestCode> {
    let writer
    switch (this.requestCode) {
      case RequestCode.FOUNDCONTENT_WRITE:
        break
      case RequestCode.FINDCONTENT_READ:
        await sendSynPacket(this.socket)
        break
      case RequestCode.OFFER_WRITE:
        if (this.content) {
          writer = await this.socket.utp.createNewWriter(this.socket, 2)
          this.socket.writer = writer
          await sendSynPacket(this.socket)
          this.socket.state = ConnectionState.SynSent
        }
        break
      case RequestCode.ACCEPT_READ:
        break
    }
    return this.requestCode
  }

  close(): void {
    this.content = Uint8Array.from([])
    this.socket.close()
  }
}
