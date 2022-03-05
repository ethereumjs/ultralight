import { Debugger } from 'debug'
import { Packet, UtpSocket } from '../..'
export default class ContentReader {
  packets: Packet[]
  inOrder: Packet[]
  reading: boolean
  gotFinPacket: boolean
  socket: UtpSocket
  nextSeqNr: number
  lastSeqNr: number | null
  logger: Debugger
  streamer: ((content: Uint8Array) => void) | undefined
  constructor(socket: UtpSocket, startingSeqNr: number, streamer?: (content: Uint8Array) => void) {
    this.socket = socket
    this.packets = new Array<Packet>()
    this.inOrder = new Array<Packet>()
    this.reading = true
    this.gotFinPacket = false
    this.nextSeqNr = startingSeqNr + 1
    this.lastSeqNr = null
    this.logger = this.socket.logger.extend('READ')
    this.streamer = streamer
  }

  async addPacket(packet: Packet): Promise<boolean> {
    this.logger(`Reading packet S:${packet.header.seqNr} A:${packet.header.ackNr}`)
    this.packets.push(packet)
    if (packet.header.seqNr === this.nextSeqNr) {
      this.inOrder.push(packet)
      this.nextSeqNr++
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

  run(): Uint8Array | undefined {
    const sortedPackets = this.packets.sort((a, b) => {
      return a.header.seqNr - b.header.seqNr
    })
    if (sortedPackets[sortedPackets.length - 1].header.seqNr === this.nextSeqNr - 1) {
      return this.compile(sortedPackets)
    } else if (this.nextSeqNr === 66000) {
      this.logger(`Sequencing Error...Compiling anyway...`)
      this.nextSeqNr = sortedPackets[sortedPackets.length - 1].header.seqNr
      return this.run()
    }
  }
}
