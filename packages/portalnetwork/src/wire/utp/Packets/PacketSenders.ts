import { UtpSocket, ConnectionState } from '../Socket/index.js'
import { Packet } from './Packet.js'
import { PacketType } from './PacketTyping.js'

export async function sendSynPacket(socket: UtpSocket): Promise<Packet> {
  const packet = Packet.create(PacketType.ST_SYN, {
    sndConnectionId: socket.sndConnectionId,
    seqNr: 1,
    ackNr: socket.ackNr,
  })
  socket.state = ConnectionState.SynSent
  await socket.sendSynPacket(packet)
  return packet
}

export async function sendSynAckPacket(socket: UtpSocket): Promise<Packet> {
  const packet = Packet.create(PacketType.ST_STATE, {
    seqNr: socket.seqNr,
    sndConnectionId: socket.sndConnectionId,
    ackNr: socket.ackNr,
    rtt_var: socket.rtt_var,
    wndSide: socket.cur_window,
  })
  await socket.sendSynAckPacket(packet)
  return packet
}
export async function sendDataPacket(socket: UtpSocket, payload: Uint8Array): Promise<Packet> {
  const packet = Packet.create(PacketType.ST_DATA, {
    seqNr: socket.seqNr,
    sndConnectionId: socket.sndConnectionId,
    ackNr: socket.ackNr,
    payload: payload,
  })
  await socket.sendDataPacket(packet)
  return packet
}
export async function sendAckPacket(socket: UtpSocket): Promise<Packet> {
  const packet = Packet.create(PacketType.ST_STATE, {
    seqNr: socket.seqNr,
    sndConnectionId: socket.sndConnectionId,
    ackNr: socket.ackNr,
    rtt_var: socket.rtt_var,
    wndSize: socket.cur_window,
  })
  await socket.sendStatePacket(packet)
  return packet
}
export async function sendResetPacket(socket: UtpSocket): Promise<Packet> {
  const packet = Packet.create(PacketType.ST_RESET, {
    seqNr: socket.seqNr++,
    sndConnectionId: socket.sndConnectionId,
    ackNr: socket.ackNr,
  })
  await socket.sendResetPacket(packet)
  return packet
}
export async function sendFinPacket(socket: UtpSocket): Promise<Packet> {
  const packet = Packet.create(PacketType.ST_FIN, {
    sndConnectionId: socket.sndConnectionId,
    seqNr: socket.seqNr,
    ackNr: socket.ackNr,
    wndSide: socket.cur_window,
  })
  socket.finNr = packet.header.seqNr
  await socket.sendFinPacket(packet)
  return packet
}
export async function sendSelectiveAckPacket(socket: UtpSocket, ackNrs: number[]) {
  const _packet = Packet.create(
    PacketType.ST_STATE,
    {
      seqNr: socket.seqNr,
      sndConnectionId: socket.sndConnectionId,
      ackNr: socket.ackNr,
      rtt_var: socket.rtt_var,
      wndSize: socket.cur_window,
      ackNrs: ackNrs,
    },
    true
  )
  await socket.sendStatePacket(_packet)
  return _packet
}
