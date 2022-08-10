import { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { Packet } from '../Packets/index.js'
import {
  sendSynPacket,
  sendSynAckPacket,
  sendAckPacket,
  sendSelectiveAckPacket,
  sendDataPacket,
  sendResetPacket,
  sendFinPacket,
} from '../Packets/PacketSenders.js'
import { UtpSocket } from '../Socket/index.js'
import ContentReader from './read/ContentReader.js'
import ContentWriter from './write/ContentWriter.js'

export class BasicUtp extends EventEmitter {
  constructor() {
    super()
  }

  createNewSocket(
    remoteAddr: string,
    sndId: number,
    rcvId: number,
    seqNr: number,
    ackNr: number,
    nextSeq: number | undefined,
    nextAck: number | undefined,
    type: 'write' | 'read',
    logger: Debugger,
    content?: Uint8Array
  ) {
    return new UtpSocket(
      this,
      remoteAddr,
      sndId,
      rcvId,
      seqNr,
      ackNr,
      nextSeq,
      nextAck,
      type,
      logger,
      content
    )
  }

  async createNewReader(socket: UtpSocket, startingDataNr: number) {
    return new ContentReader(socket, startingDataNr)
  }

  async createNewWriter(socket: UtpSocket, startingDataNr: number) {
    return new ContentWriter(this, socket, startingDataNr)
  }

  async sendSynPacket(socket: UtpSocket) {
    return await sendSynPacket(socket)
  }
  async sendSynAckPacket(socket: UtpSocket): Promise<Packet> {
    return await sendSynAckPacket(socket)
  }
  async sendStatePacket(socket: UtpSocket): Promise<Packet> {
    return await sendAckPacket(socket)
  }
  async sendSelectiveAckPacket(socket: UtpSocket, ackNrs: number[]): Promise<Packet> {
    return await sendSelectiveAckPacket(socket, ackNrs)
  }
  async sendDataPacket(socket: UtpSocket, payload: Uint8Array): Promise<Packet> {
    const packet = await sendDataPacket(socket, payload)
    return packet
  }
  async sendResetPacket(socket: UtpSocket): Promise<Packet> {
    return await sendResetPacket(socket)
  }
  async sendFinPacket(socket: UtpSocket): Promise<Packet> {
    return await sendFinPacket(socket)
  }

  async handleSynPacket(socket: UtpSocket, _packet: Packet): Promise<Packet> {
    return await socket.handleSynPacket()
  }
  async handleSynAckPacket(socket: UtpSocket, packet: Packet) {
    await socket.handleStatePacket(packet)
  }
  async handleStatePacket(socket: UtpSocket, packet: Packet): Promise<void | boolean> {
    const done = await socket.handleStatePacket(packet)
    if (done === true) {
      return true
    } else {
      return false
    }
  }
  async handleDataPacket(socket: UtpSocket, packet: Packet) {
    return await socket.handleDataPacket(packet)
  }
  async handleFinPacket(socket: UtpSocket, packet: Packet): Promise<Uint8Array | undefined> {
    const content = await socket.handleFinPacket(packet)
    return content
  }
}
