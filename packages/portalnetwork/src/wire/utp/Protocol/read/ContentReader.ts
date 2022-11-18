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
    this.packets.push(packet)
    if (packet.header.seqNr === this.nextDataNr) {
      this.inOrder.push(packet)
      this.nextDataNr++
      return true
    } else {
      return false
    }
  }

  async compile(precompiled: Uint8Array[]): Promise<Uint8Array> {
    const compiled = Buffer.concat(precompiled.flatMap((v) => Buffer.from(v)))
    this.logger(`${compiled.length} Bytes Received.`)
    return compiled
  }

  async run(): Promise<Uint8Array> {
    const sortedPackets = this.packets.sort((a, b) => {
      return a.header.seqNr - b.header.seqNr
    })
    const precompiled = sortedPackets.map((pk) => {
      return pk.payload
    })
    const compiled = await this.compile(precompiled)
    return compiled
  }
}
