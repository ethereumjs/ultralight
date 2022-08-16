import { toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import { UtpSocket } from '../../index.js'
import { sendDataPacket } from '../../Packets/PacketSenders.js'
import { BUFFER_SIZE } from '../../Packets/PacketTyping.js'
import { BasicUtp } from '../BasicUtp.js'

export default class ContentWriter {
  protocol: BasicUtp
  socket: UtpSocket
  startingSeqNr: number
  seqNr: number
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
    this.seqNr = startingSeqNr
    this.writing = false
    this.sentChunks = []
    this.logger = this.socket.logger.extend('WRITING')
    this.dataChunks = this.chunk()
  }

  async start(): Promise<void> {
    const chunks = Object.keys(this.dataChunks).length
    this.socket.logger(`starting to send ${chunks} DATA Packets`)
    this.writing = true
    let bytes: Uint8Array
    while (this.writing) {
      bytes = this.dataChunks[this.seqNr] ?? []
      this.sentChunks.push(this.seqNr)
      this.socket.logger(
        `Sending ST-DATA ${this.sentChunks.length}/${chunks} -- SeqNr: ${this.socket.seqNr}  AckNr: ${this.socket.ackNr}`
      )
      await sendDataPacket(this.socket, bytes)
      this.writing = chunks !== this.sentChunks.length
      this.seqNr++
    }
    return
  }

  chunk(): Record<number, Uint8Array> {
    let arrayMod = this.content
    this.logger(
      `Preparing ${toHexString(this.content).slice(
        0,
        20
      )} For transfer as ${BUFFER_SIZE} byte chunks.`
    )
    const total = Math.ceil(this.content.length / BUFFER_SIZE)
    const dataChunks: Record<number, Uint8Array> = {}
    for (let i = 0; i < total; i++) {
      const start = 0
      const end = arrayMod.length > 512 ? 512 : undefined
      dataChunks[i + this.startingSeqNr] = arrayMod.subarray(start, end)
      arrayMod = arrayMod.subarray(end)

      this.socket.dataNrs.push(i + this.startingSeqNr)
    }
    this.logger(`Ready to send ${total} Packets`)
    return dataChunks
  }
}
