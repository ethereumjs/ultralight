import { Debugger } from 'debug'
import { _UTPSocket } from '..'
import { HistoryNetworkContentKey } from '../../..'

export class HistoryNetworkContentRequest {
  requestCode: number
  contentKey: HistoryNetworkContentKey
  content: Uint8Array | undefined
  socketKey: string | undefined
  socket: _UTPSocket

  constructor(
    requestCode: number,
    contentKey: HistoryNetworkContentKey,
    content: Uint8Array | undefined,
    socketKey: string | undefined,
    socket: _UTPSocket
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
        this.socket.sendSynPacket()
        break
      case 1:
        break
      case 2:
        break
      case 3:
        this.socket.sendSynPacket()
        break
    }
  }
}
