import debug from 'debug'
import { Packet, _UTPSocket } from '../..'

const log = debug('<uTP>:Reader')
export default class Reader {
  packets: Packet[]
  inOrder: Packet[]
  reading: boolean
  gotFinPacket: boolean
  socket: _UTPSocket
  nextSeqNr: number
  lastSeqNr: number | null
  constructor(socket: _UTPSocket) {
    this.socket = socket
    this.packets = new Array<Packet>()
    this.inOrder = new Array<Packet>()
    this.reading = true
    this.gotFinPacket = false
    this.nextSeqNr = 2
    this.lastSeqNr = null
  }

  async addPacket(packet: Packet): Promise<boolean> {
    log(`Packet Received.  seqNr: ${packet.header.seqNr}`)
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
    log(`${compiled.length} Bytes Received.`)
    log(`${Uint8Array.from(compiled).toString().slice(0, 20)}...`)
    this.socket.utp.portal.emit('Stream', this.socket.sndConnectionId, compiled)
    return Uint8Array.from(compiled)
  }

  run(): Uint8Array | undefined {
    const sortedPackets = this.packets.sort((a, b) => {
      return a.header.seqNr - b.header.seqNr
    })
    if (sortedPackets[sortedPackets.length - 1].header.seqNr === this.nextSeqNr - 1) {
      return this.compile(sortedPackets)
    } else if (this.nextSeqNr === 66000) {
      log(`Sequencing Error...Compiling anyway...`)
      this.nextSeqNr = sortedPackets[sortedPackets.length - 1].header.seqNr
      return this.run()
    }
  }
}
