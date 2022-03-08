import { Debugger } from 'debug'
import { Packet, UtpSocket } from '..'
import { SubNetworkIds } from '../..'
import ContentReader from './read/ContentReader'
import ContentWriter from './write/ContentWriter'
import {
  sendDataPacket,
  sendSynAckPacket,
  sendSynPacket,
  sendSelectiveAckPacket,
  sendResetPacket,
  sendFinPacket,
  sendAckPacket,
} from '../Packets/PacketSenders'

export class BasicUtp {
  send: (peerId: string, msg: Buffer, networkId: SubNetworkIds) => Promise<void>

  constructor(send: (peerId: string, msg: Buffer, networkId: SubNetworkIds) => Promise<void>) {
    this.send = send
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

  async createNewReader(
    socket: UtpSocket,
    startingDataNr: number,
    streamer: (content: Uint8Array) => void
  ) {
    return new ContentReader(socket, startingDataNr, streamer)
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
  async sendSelectiveAckPacket(socket: UtpSocket) {
    await sendSelectiveAckPacket(socket)
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

  async handleSynPacket(socket: UtpSocket, packet: Packet) {
    await socket.handleSynPacket(packet)
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
