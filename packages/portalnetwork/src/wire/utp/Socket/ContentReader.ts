import debug from 'debug'
import { Debugger } from 'debug'
import { StatePacket, UtpSocket } from '../index.js'
export default class ContentReader {
  packets: StatePacket[]
  inOrder: StatePacket[]
  reading: boolean
  startingDataNr: number
  nextDataNr: number | undefined
  lastDataNr: number | undefined
  logger: Debugger
  constructor(startingDataNr: number) {
    this.packets = new Array<StatePacket>()
    this.inOrder = new Array<StatePacket>()
    this.reading = true
    this.startingDataNr = startingDataNr
    this.nextDataNr = startingDataNr
    this.lastDataNr = undefined
    this.logger = debug('read').extend('READING')
    // this.socket.reader = this
  }

  async addPacket(packet: StatePacket): Promise<boolean | number> {
    this.packets.push(packet)
    if (packet.header.seqNr === this.nextDataNr) {
      this.nextDataNr++
      return this.inOrder.push(packet)
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
      return pk.payload!
    })
    const compiled = await this.compile(precompiled)
    return compiled
  }
}
