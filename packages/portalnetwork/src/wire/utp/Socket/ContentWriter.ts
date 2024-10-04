import { BUFFER_SIZE } from '../Packets/PacketTyping.js'

import type { WriteSocket } from './WriteSocket.js'
import type { Debugger } from 'debug'
export class ContentWriter {
  socket: WriteSocket
  logger: Debugger
  startingSeqNr: number
  seqNr: number
  content: Uint8Array
  writing: boolean
  sentChunks: number[]
  dataChunks: Record<number, Uint8Array>
  dataNrs: number[]
  constructor(socket: WriteSocket, content: Uint8Array, startingSeqNr: number, logger: Debugger) {
    this.socket = socket
    this.content = content
    this.startingSeqNr = startingSeqNr
    this.seqNr = startingSeqNr
    this.writing = false
    this.sentChunks = []
    this.dataNrs = []
    this.logger = logger.extend('WRITING')
    this.dataChunks = {}
  }

  async write(): Promise<void> {
    if (!this.writing) return
    const chunks = Object.keys(this.dataChunks).length
    let bytes: Uint8Array
    if (this.sentChunks.length < chunks) {
      bytes = this.dataChunks[this.seqNr] ?? []
      !this.sentChunks.includes(this.seqNr) && this.sentChunks.push(this.seqNr)
      this.logger(
        `Sending ST-DATA ${this.seqNr - this.startingSeqNr + 1}/${chunks} -- SeqNr: ${this.seqNr}`,
      )
      this.seqNr = this.sentChunks.slice(-1)[0] + 1
      await this.socket.sendDataPacket(bytes)
      return
    }
    this.writing = false
    return
  }

  async start(): Promise<void> {
    this.writing = true
    this.dataChunks = this.chunk()
    await this.write()
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
