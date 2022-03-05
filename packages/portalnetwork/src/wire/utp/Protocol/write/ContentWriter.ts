import { Debugger } from 'debug'
import { TWO_MINUTES, UtpSocket } from '../..'
import { BasicUtp } from '../../PortalNetworkUtp/BasicUtp'

const _MIN_RTO = TWO_MINUTES
export default class ContentWriter {
  protocol: BasicUtp
  socket: UtpSocket
  startingSeqNr: number
  content: Uint8Array
  writing: boolean
  sentChunks: number[]
  dataChunks: Map<number, Uint8Array>
  logger: Debugger
  constructor(protocol: BasicUtp, socket: UtpSocket, startingSeqNr: number) {
    this.protocol = protocol
    this.socket = socket
    this.content = this.socket.content
    this.startingSeqNr = startingSeqNr
    this.writing = false
    this.dataChunks = new Map<number, Uint8Array>()
    this.sentChunks = []
    this.logger = this.socket.logger.extend('WRITE')
    this.chunk(this.content, 500)
  }

  async start(): Promise<void> {
    let seqNr = this.startingSeqNr
    this.logger(`starting to write`, Uint8Array.from(this.content))
    this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    while (this.writing) {
      const bytes = this.dataChunks.get(seqNr)
      seqNr = await this.protocol.sendDataPacket(this.socket, bytes!)
      this.sentChunks.push(seqNr)
      this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    }
    this.logger('All Data Written')
    return
  }

  async startAgain(seqNr: number) {
    this.logger(`starting again from ${seqNr}`, Uint8Array.from(this.content))
    this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    this.sentChunks = this.sentChunks.filter((n) => n < seqNr)
    while (this.writing) {
      const bytes = this.dataChunks.get(seqNr)
      seqNr = await this.protocol.sendDataPacket(this.socket, bytes!)
      this.sentChunks.push(seqNr)
      this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    }
    this.logger('All Data Written')
  }

  chunk(content: Uint8Array, size: number) {
    let seqNr = this.startingSeqNr
    let contentMod = content
    let next = contentMod.subarray(0, size)
    let rest = contentMod.subarray(size)
    while (contentMod.length > 0) {
      this.dataChunks.set(seqNr++, next)
      next = contentMod.subarray(0, size)
      rest = contentMod.subarray(size)
      contentMod = rest
    }
  }
}
