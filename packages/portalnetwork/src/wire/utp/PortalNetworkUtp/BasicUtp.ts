import { Debugger } from 'debug'
import { Packet, UtpSocket } from '..'
import { SubNetworkIds } from '../..'
import ContentReader from '../Protocol/read/ContentReader'
import ContentWriter from '../Protocol/write/ContentWriter'
import {
  sendDataPacket,
  sendSynAckPacket,
  sendSynPacket,
  sendSelectiveAckPacket,
  sendResetPacket,
  sendFinPacket,
  sendAckPacket,
} from './PacketSenders'

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
    type: 'write' | 'read',
    logger: Debugger,
    content?: Uint8Array
  ) {
    return new UtpSocket(this, remoteAddr, sndId, rcvId, seqNr, ackNr, type, logger, content)
  }

  createNewReader(
    socket: UtpSocket,
    startingSeqNr: number,
    streamer: (content: Uint8Array) => void
  ) {
    return new ContentReader(socket, startingSeqNr, streamer)
  }
  createNewWriter(socket: UtpSocket, startingSeqNr: number) {
    return new ContentWriter(this, socket, startingSeqNr)
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
    await sendDataPacket(socket, payload)
    return socket.seqNr
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
  async handleStatePacket(socket: UtpSocket, packet: Packet) {
    await socket.handleStatePacket(packet)
  }
  async handleDataPacket(socket: UtpSocket, packet: Packet) {
    await socket.handleDataPacket(packet)
  }
  async handleFinPacket(socket: UtpSocket, packet: Packet) {
    await socket.handleFinPacket(packet)
  }
}
