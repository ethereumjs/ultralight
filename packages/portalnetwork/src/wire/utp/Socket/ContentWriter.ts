import { Debugger } from 'debug'
import { BUFFER_SIZE, PacketType } from '../Packets/PacketTyping.js'
import { EventEmitter } from 'events'
export default class ContentWriter extends EventEmitter {
  logger: Debugger
  startingSeqNr: number
  seqNr: number
  content: Uint8Array
  writing: boolean
  sentChunks: number[]
  dataChunks: Record<number, Uint8Array>
  dataNrs: number[]
  constructor(content: Uint8Array, startingSeqNr: number, logger: Debugger) {
    super()
    this.content = content
    this.startingSeqNr = startingSeqNr
    this.seqNr = startingSeqNr
    this.writing = false
    this.sentChunks = []
    this.dataNrs = []
    this.logger = logger.extend('WRITING')
    this.dataChunks = {}
  }

  async send(packetType: PacketType, bytes?: Uint8Array) {
    this.logger(`Sending ${PacketType[packetType]} packet.`)
    this.emit('send', packetType, bytes)
    return new Promise((resolve, reject) => {
      this.once('sent', () => resolve(true))
    })
  }

  async write(): Promise<void> {
    const chunks = Object.keys(this.dataChunks).length
    let bytes: Uint8Array
    if (this.sentChunks.length < chunks) {
      bytes = this.dataChunks[this.seqNr] ?? []
      !this.sentChunks.includes(this.seqNr) && this.sentChunks.push(this.seqNr)
      this.logger(
        `Sending ST-DATA ${this.seqNr - this.startingSeqNr + 1}/${chunks} -- SeqNr: {
          this.socket.seqNr
        }`
      )
      this.seqNr = this.sentChunks.slice(-1)[0] + 1

      await this.send(PacketType.ST_DATA, bytes)
      return
    }
    this.writing = false
    await this.send(PacketType.ST_FIN)
    return
  }

  async start(): Promise<void> {
    this.writing = true
    this.dataChunks = this.chunk()
    this.write()
  }

  chunk(): Record<number, Uint8Array> {
    let arrayMod = this.content
    const total = Math.ceil(this.content.length / BUFFER_SIZE)
    this.logger(`Preparing content for transfer as ${total} ${BUFFER_SIZE} byte chunks.`)
    const dataChunks: Record<number, Uint8Array> = {}
    for (let i = 0; i < total; i++) {
      const start = 0
      const end = arrayMod.length > 512 ? 512 : undefined
      dataChunks[i + this.startingSeqNr] = arrayMod.subarray(start, end)
      arrayMod = arrayMod.subarray(end)
      this.dataNrs.push(i + this.startingSeqNr)
    }
    this.logger(`Ready to send ${total} Packets starting at SeqNr: ${this.startingSeqNr}`)
    return dataChunks
  }
}
