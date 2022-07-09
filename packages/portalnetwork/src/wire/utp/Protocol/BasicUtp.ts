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

  async startDataTransfer(socket: UtpSocket) {
    await socket.startDataTransfer()
  }

  async sendSynPacket(socket: UtpSocket) {
    await sendSynPacket(socket)
  }
  async sendSynAckPacket(socket: UtpSocket) {
    await sendSynAckPacket(socket)
  }
  async sendStatePacket(socket: UtpSocket) {
    await sendAckPacket(socket)
  }
  async sendSelectiveAckPacket(socket: UtpSocket, ackNrs: number[]) {
    await sendSelectiveAckPacket(socket, ackNrs)
  }
  async sendDataPacket(socket: UtpSocket, payload: Uint8Array): Promise<number> {
    const seqNr = await sendDataPacket(socket, payload)
    return seqNr
  }
  async sendResetPacket(socket: UtpSocket) {
    await sendResetPacket(socket)
  }
  async sendFinPacket(socket: UtpSocket) {
    await sendFinPacket(socket)
  }

  async handleSynPacket(socket: UtpSocket, _packet: Packet) {
    await socket.handleSynPacket()
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
    await socket.handleDataPacket(packet)
  }
  async handleFinPacket(socket: UtpSocket, packet: Packet): Promise<Uint8Array | undefined> {
    const content = await socket.handleFinPacket(packet)
    return content
  }
}
