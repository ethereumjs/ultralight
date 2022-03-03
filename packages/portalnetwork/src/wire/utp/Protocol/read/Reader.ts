import { Debugger } from 'debug'
import { Packet, _UTPSocket } from '../..'
import { HistoryNetworkContentTypes } from '../../../../historySubnetwork/types'

export default class Reader {
  packets: Packet[]
  inOrder: Packet[]
  reading: boolean
  gotFinPacket: boolean
  socket: _UTPSocket
  nextSeqNr: number
  lastSeqNr: number | null
  logger: Debugger
  blockHash: Uint8Array
  constructor(socket: _UTPSocket, startingSeqNr: number, blockHash: Uint8Array) {
    this.socket = socket
    this.packets = new Array<Packet>()
    this.inOrder = new Array<Packet>()
    this.reading = true
    this.gotFinPacket = false
    this.nextSeqNr = startingSeqNr + 1
    this.lastSeqNr = null
    this.logger = this.socket.logger.extend('READ')
    this.blockHash = blockHash
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
    this.socket.utp.portal.emit(
      'Stream',
      this.socket.sndConnectionId,
      compiled,
      HistoryNetworkContentTypes.BlockBody,
      this.blockHash
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
