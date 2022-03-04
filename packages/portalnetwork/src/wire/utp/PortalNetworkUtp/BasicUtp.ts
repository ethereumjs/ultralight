import { Packet, _UTPSocket } from '..'
import Reader from '../Protocol/read/Reader'
import Writer from '../Protocol/write/Writer'
import { handleSynPacket } from './PacketHandlers'
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
  createNewSocket(
    remoteAddr: string,
    sndId: number,
    rcvId: number,
    type: 'write' | 'read',
    content?: Uint8Array
  ) {
    return new _UTPSocket(this, remoteAddr, sndId, rcvId, type, content)
  }

  createNewReader() {}
  createNewWriter() {}

  async sendSynPacket(socket: _UTPSocket) {
    await sendSynPacket(socket)
  }
  async sendSynAckPacket(socket: _UTPSocket) {
    await sendSynAckPacket(socket)
  }
  async sendStatePacket(socket: _UTPSocket) {
    await sendAckPacket(socket)
  }
  async sendSelectiveAckPacket(socket: _UTPSocket) {
    await sendSelectiveAckPacket(socket)
  }
  async sendDataPacket(socket: _UTPSocket, payload: Uint8Array) {
    await sendDataPacket(socket, payload)
  }
  async sendResetPacket(socket: _UTPSocket) {
    await sendResetPacket(socket)
  }
  async sendFinPacket(socket: _UTPSocket) {
    await sendFinPacket(socket)
  }

  async handleSynPacket(socket: _UTPSocket, packet: Packet, startingSeqNr: number) {
    await socket.handleSynPacket(packet, startingSeqNr)
  }
  async handleSynAckPacket(socket: _UTPSocket, packet: Packet) {
    await socket.handleSynAckPacket(packet)
  }
  async handleStatePacket(socket: _UTPSocket, packet: Packet) {
    await socket.handleStatePacket(packet)
  }
  async handleDataPacket(socket: _UTPSocket, packet: Packet) {
    await socket.handleDataPacket(packet)
  }
  async handleResetPacket(socket: _UTPSocket) {
    await socket.handleResetPacket()
  }
  async handleFinPacket(socket: _UTPSocket, packet: Packet) {
    await socket.handleFinPacket(packet)
  }
}
