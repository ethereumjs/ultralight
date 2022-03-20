import { Debugger } from 'debug'
import { TWO_MINUTES, UtpSocket } from '../..'
import { sendDataPacket } from '../../Packets/PacketSenders'
import { BasicUtp } from '../BasicUtp'

const _MIN_RTO = TWO_MINUTES
export default class ContentWriter {
  protocol: BasicUtp
  socket: UtpSocket
  startingSeqNr: number
  content: Uint8Array
  writing: boolean
  sentChunks: number[]
  dataChunks: Record<number, Uint8Array>
  logger: Debugger
  constructor(protocol: BasicUtp, socket: UtpSocket, startingSeqNr: number) {
    this.protocol = protocol
    this.socket = socket
    this.content = socket.content
    this.startingSeqNr = startingSeqNr
    this.writing = false
    this.sentChunks = []
    this.logger = this.socket.logger.extend('WRITING')
    this.dataChunks = this.chunk(this.content, 500)
  }

  async start(): Promise<void> {
    const chunks = Object.keys(this.dataChunks).length
    this.socket.logger(`starting to send ${chunks} DATA Packets`)
    this.writing = true
    let bytes: Uint8Array
    while (this.writing) {
      if (this.sentChunks.length > this.socket.ackNrs.length) {
        this.socket.logger(
          `Ahead of Reader by ${this.sentChunks.length - this.socket.ackNrs.length} packets`
        )
      }
      bytes = this.dataChunks[this.socket.seqNr]
      this.sentChunks.push(this.socket.seqNr)
      this.socket.logger(
        `Sending Data Packet ${this.sentChunks.length}/${chunks} with seqNr: ${
          this.socket.seqNr
        }.  size: ${bytes && bytes.length}`
      )
      const sent = await sendDataPacket(this.socket, bytes)
      this.socket.logger(sent)
      this.socket.seqNr += 1
      this.writing = chunks !== this.sentChunks.length
    }
    // this.logger('All Data Written')
    return
  }

  async startAgain(seqNr: number) {
    this.logger(`starting again from ${seqNr}`, Uint8Array.from(this.content))
    this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    this.sentChunks = this.sentChunks.filter((n) => n < seqNr)
    while (this.writing) {
      const bytes = this.dataChunks[seqNr]
      seqNr = await this.protocol.sendDataPacket(this.socket, bytes!)
      this.sentChunks.push(seqNr)
      this.writing = Object.keys(this.dataChunks).length > this.sentChunks.length
    }
    this.logger('All Data Written')
  }

  chunk(content: Uint8Array, size: number): Record<number, Uint8Array> {
    let arrayMod = content
    this.logger(`Preparing`)
    this.logger(content)
    this.logger(`For transfer as ${size} byte chunks.`)
    const full = Math.floor(content.length / size)
    const partial = content.length % size > 0 ? 1 : 0
    const total = full + partial
    const dataChunks: Record<number, Uint8Array> = {}
    for (let i = 0; i < total; i++) {
      const start = 0
      const end = arrayMod.length > 500 ? 500 : undefined
      dataChunks[i + this.startingSeqNr] = arrayMod.subarray(start, end)
      arrayMod = arrayMod.subarray(end)

      this.socket.dataNrs.push(i + this.startingSeqNr)
    }
    this.logger(`Ready to send ${total} Packets`)
    return dataChunks
  }
}
