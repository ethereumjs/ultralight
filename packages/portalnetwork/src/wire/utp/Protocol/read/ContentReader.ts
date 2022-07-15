import { Debugger } from 'debug'
import { Packet, UtpSocket } from '../../index.js'
export default class ContentReader {
  packets: Packet[]
  inOrder: Packet[]
  reading: boolean
  gotFinPacket: boolean
  socket: UtpSocket
  startingDataNr: number
  nextDataNr: number | undefined
  lastDataNr: number | undefined
  logger: Debugger
  constructor(socket: UtpSocket, startingDataNr: number) {
    this.socket = socket
    this.packets = new Array<Packet>()
    this.inOrder = new Array<Packet>()
    this.reading = true
    this.gotFinPacket = false
    this.startingDataNr = startingDataNr
    this.nextDataNr = startingDataNr
    this.lastDataNr = undefined
    this.logger = this.socket.logger.extend('READING')
    this.socket.reader = this
  }

  async addPacket(packet: Packet): Promise<boolean> {
    this.logger(`Reading packet S:${packet.header.seqNr} A:${packet.header.ackNr}`)
    this.packets.push(packet)
    if (packet.header.seqNr === this.nextDataNr) {
      this.inOrder.push(packet)
      this.nextDataNr++
      return true
    } else {
      return false
    }
  }

  notEmpty() {
    return this.packets.length > 0
  }

  async compile(precompiled: Uint8Array[]): Promise<Uint8Array> {
    let compiled = Buffer.from([])
    precompiled.forEach((p) => {
      compiled = Buffer.concat([compiled, Buffer.from(p)])
    })
    this.logger(`${compiled.length} Bytes Received.`)
    this.logger(Uint8Array.from(compiled))

    return Uint8Array.from(compiled)
  }

  async run(): Promise<Uint8Array | undefined> {
    const sortedPackets = this.packets.sort((a, b) => {
      return a.header.seqNr - b.header.seqNr
    })
    try {
      const precompiled = sortedPackets.map((pk) => {
        return pk.payload
      })
      const compiled = await this.compile(precompiled)
      return compiled
    } catch {
      this.logger(`Cannot run reader...`)
    }
  }
}
