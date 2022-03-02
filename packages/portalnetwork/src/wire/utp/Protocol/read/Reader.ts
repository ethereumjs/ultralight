import { Debugger } from 'debug'
import { Packet, _UTPSocket } from '../..'

export default class Reader {
  packets: Packet[]
  inOrder: Packet[]
  reading: boolean
  gotFinPacket: boolean
  socket: _UTPSocket
  nextSeqNr: number
  lastSeqNr: number | null
  logger: Debugger
  constructor(socket: _UTPSocket) {
    this.socket = socket
    this.packets = new Array<Packet>()
    this.inOrder = new Array<Packet>()
    this.reading = true
    this.gotFinPacket = false
    this.nextSeqNr = 2
    this.lastSeqNr = null
    this.logger = this.socket.logger.extend('READING')
  }

  async addPacket(packet: Packet): Promise<boolean> {
    this.packets.push(packet)
    if (packet.header.seqNr === this.nextSeqNr) {
      this.nextSeqNr++
      return true
    } else {
      this.packets.push(packet)
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
    this.logger(`${Uint8Array.from(compiled).toString().slice(0, 20)}...`)
    this.socket.utp.portal.emit(
      'Stream',
      this.socket.sndConnectionId,
      compiled,
      this.socket.contentType
    )
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
