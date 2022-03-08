import { Debugger } from 'debug'
import { Packet, UtpSocket } from '../..'
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
  streamer: (content: Uint8Array) => void
  constructor(socket: UtpSocket, startingDataNr: number, streamer: (content: Uint8Array) => void) {
    this.socket = socket
    this.packets = new Array<Packet>()
    this.inOrder = new Array<Packet>()
    this.reading = true
    this.gotFinPacket = false
    this.startingDataNr = startingDataNr
    this.nextDataNr = startingDataNr
    this.lastDataNr = undefined
    this.logger = this.socket.logger.extend('READING')
    this.streamer = streamer
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

  compile(packets: Packet[]): Uint8Array {
    let compiled = Buffer.from([])
    packets.forEach((p) => {
      compiled = Buffer.concat([compiled, Buffer.from(p.payload)])
    })
    this.logger(`${compiled.length} Bytes Received.`)
    this.logger(Uint8Array.from(compiled))
    if (this.streamer) {
      this.streamer(compiled)
    }
    return Uint8Array.from(compiled)
  }

  async run(): Promise<Uint8Array | undefined> {
    const sortedPackets = this.packets.sort((a, b) => {
      return a.header.seqNr - b.header.seqNr
    })
    try {
      const compiled = this.compile(sortedPackets)
      this.streamer(compiled)
      return compiled
    } catch {
      this.logger(`Cannot run reader...`)
    }
  }
}
