import { BUFFER_SIZE } from '../Packets/PacketTyping.js'

import type { Debugger } from 'debug'
import type { WriteSocket } from './WriteSocket.js'
export class ContentWriter {
  socket: WriteSocket
  logger: Debugger
  startingSeqNr: number
  seqNr: number
  content: Uint8Array
  writing: boolean
  sentChunks: number[]
  dataChunks: Array<[number, Uint8Array]>

  constructor(socket: WriteSocket, content: Uint8Array, startingSeqNr: number, logger: Debugger) {
    this.socket = socket
    this.content = content
    this.startingSeqNr = startingSeqNr
    this.seqNr = startingSeqNr
    this.writing = false
    this.sentChunks = []
    this.logger = logger.extend('WRITING')
    this.dataChunks = []
  }

  async write(): Promise<void> {
    if (!this.writing) return
    const totalChunks = this.dataChunks.length
    let bytes: Uint8Array
    if (this.sentChunks.length < totalChunks) {
      bytes = this.dataChunks[this.sentChunks.length][1] ?? []
      this.sentChunks.push(this.seqNr)
      this.logger(
        `Sending ST-DATA ${this.sentChunks.length}/${totalChunks} -- SeqNr: ${this.seqNr}`,
      )
      this.seqNr = this.sentChunks.slice(-1)[0] + 1
      // Reset to 0 since ackNr and seqNr are 16 bit unsigned integers
      if (this.seqNr > 65535) {
        this.seqNr = 0
      }
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

  chunk(): [number, Uint8Array][] {
    let arrayMod = this.content
    const total = Math.ceil(this.content.length / BUFFER_SIZE)
    this.logger(`Preparing content for transfer as ${total} ${BUFFER_SIZE} byte chunks.`)
    const dataChunks = new Array<[number, Uint8Array]>(total)
    let seqNr = this.startingSeqNr
    for (let i = 0; i < total; i++) {
      const start = 0
      const end = arrayMod.length > 512 ? 512 : undefined
      dataChunks[i] = [seqNr, arrayMod.subarray(start, end)]
      arrayMod = arrayMod.subarray(end)
      seqNr++
      if (seqNr > 65535) {
        seqNr = 0
      } // Reset to 0 if next sequence number > 65535
    }
    this.logger(`Ready to send ${total} Packets starting at SeqNr: ${this.startingSeqNr}`)
    return dataChunks
  }
}
