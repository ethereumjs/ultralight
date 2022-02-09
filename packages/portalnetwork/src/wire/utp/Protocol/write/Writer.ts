import { Debugger } from 'debug'
import { UtpProtocol } from '..'
import { Packet, TWO_MINUTES, _UTPSocket } from '../..'

const _MIN_RTO = TWO_MINUTES
export default class Writer {
  utp: UtpProtocol
  socket: _UTPSocket
  content: Uint8Array
  contentMod: Uint8Array
  writing: boolean
  finished: boolean
  canSendNextPacket: boolean
  timestamp: number
  sentBytes: Map<Packet, Uint8Array>
  logger: Debugger
  constructor(utp: UtpProtocol, socket: _UTPSocket, content: Uint8Array, timestamp: number) {
    this.socket = socket
    this.utp = utp
    this.timestamp = timestamp
    this.content = content
    this.contentMod = this.content
    this.writing = false
    this.finished = false
    this.canSendNextPacket = true
    this.sentBytes = new Map<Packet, Uint8Array>()
    this.logger = this.socket.logger.extend('WRITE')
  }

  async start(): Promise<void> {
    this.logger(`starting to write`, this.content)
    this.writing = this.content && true
    while (this.writing) {
      while (this.canSendNextPacket && !this.finished) {
        // let size = this.nextPacketSize();
        const bytes = this.getNextBytes(this.contentMod)
        this.socket.sendDataPacket(bytes).then((p: Packet) => {
          // this.socket.seqNrs.push(p.header.seqNr)
          this.sentBytes.set(p, bytes)
        })
        if (this.contentMod.length == 0) {
          this.canSendNextPacket = false
          this.finished = true
          this.writing = false
          this.logger('All Data Written')
          return
        }
      }
    }
  }

  nextPacketSize(): number {
    return this.contentMod.length > 900 ? 900 : this.contentMod.length
  }

  getNextBytes(array: Uint8Array, _idx: number = 100): Uint8Array {
    const next = array.subarray(0, 500)
    const rest = array.slice(500)
    this.logger(`sending ${next.length} bytes...`)
    this.logger(`${rest.length} bytes left`)
    this.setContentMod(rest)
    return next
  }

  setContentMod(subArray: Uint8Array) {
    this.contentMod = subArray
  }
}
