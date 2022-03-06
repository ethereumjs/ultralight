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
  dataChunks: Record<number, Uint8Array>
  constructor(protocol: BasicUtp, socket: UtpSocket, startingSeqNr: number) {
    this.protocol = protocol
    this.socket = socket
    this.content = socket.content
    this.startingSeqNr = startingSeqNr
    this.writing = false
    this.dataChunks = this.chunk(this.content, 500)
    this.sentChunks = []
  }

  async start(): Promise<void> {
    let seqNr = this.startingSeqNr
    this.socket.logger(`starting to write:`)
    this.socket.logger(Uint8Array.from(this.content))
    this.writing = true
    let bytes
    while (this.writing) {
      bytes = this.dataChunks[seqNr]
      seqNr = await this.protocol.sendDataPacket(this.socket, bytes)
      this.socket.logger(`${seqNr} sent.`)
      this.sentChunks.push(seqNr)
      this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    }
    this.socket.logger('All Data Written')
    return
  }

  async startAgain(seqNr: number) {
    this.socket.logger(`starting again from ${seqNr}`, Uint8Array.from(this.content))
    this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    this.sentChunks = this.sentChunks.filter((n) => n < seqNr)
    while (this.writing) {
      const bytes = this.dataChunks[seqNr]
      seqNr = await this.protocol.sendDataPacket(this.socket, bytes!)
      this.sentChunks.push(seqNr)
      this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    }
    this.socket.logger('All Data Written')
  }

  chunk(content: Uint8Array, size: number): Record<number, Uint8Array> {
    let seqNr = this.startingSeqNr
    let contentMod = content
    let next = contentMod.subarray(0, size)
    let rest = contentMod.subarray(size)
    const dataChunks: Record<number, Uint8Array> = {}
    while (contentMod.length > 0) {
      dataChunks[seqNr] = next
      this.socket.dataNrs.push(seqNr)
      seqNr++
      next = contentMod.subarray(0, size)
      rest = contentMod.subarray(size)
      contentMod = rest
    }
    this.socket.logger(`Ready to send ${Object.keys(dataChunks).length}`)
    return dataChunks
  }
}
