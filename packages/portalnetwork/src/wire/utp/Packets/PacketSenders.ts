import { UtpSocket, ConnectionState } from '../Socket'
import {
  createSynPacket,
  createAckPacket,
  createDataPacket,
  createResetPacket,
  createFinPacket,
  createSelectiveAckPacket,
} from './Packet'

export async function sendSynPacket(socket: UtpSocket): Promise<void> {
  const packet = createSynPacket(socket.sndConnectionId - 1, 1, socket.ackNr)
  socket.state = ConnectionState.SynSent
  await socket.sendSynPacket(packet)
}

export async function sendSynAckPacket(socket: UtpSocket): Promise<void> {
  const packet = createAckPacket(
    socket.seqNr,
    socket.sndConnectionId,
    socket.ackNr,
    socket.rtt_var,
    socket.cur_window
  )
  await socket.sendSynAckPacket(packet)
}
export async function sendDataPacket(socket: UtpSocket, payload: Uint8Array): Promise<number> {
  const packet = createDataPacket(
    socket.seqNr,
    socket.sndConnectionId,
    socket.ackNr,
    socket.max_window,
    payload,
    socket.rtt_var
  )
  const seqNr = await socket.sendDataPacket(packet)
  return seqNr
}
export async function sendAckPacket(socket: UtpSocket): Promise<void> {
  const packet = createAckPacket(
    socket.seqNr,
    socket.sndConnectionId,
    socket.ackNr,
    socket.rtt_var,
    socket.cur_window
  )
  await socket.sendStatePacket(packet)
}
export async function sendResetPacket(socket: UtpSocket): Promise<void> {
  const packet = createResetPacket(socket.seqNr++, socket.sndConnectionId, socket.ackNr)
  await socket.sendResetPacket(packet)
}
export async function sendFinPacket(socket: UtpSocket): Promise<void> {
  const packet = createFinPacket(
    socket.sndConnectionId,
    socket.seqNr,
    socket.ackNr,
    socket.cur_window
  )
  socket.finNr = packet.header.seqNr
  await socket.sendFinPacket(packet)
}
export async function sendSelectiveAckPacket(socket: UtpSocket, ackNrs: number[]) {
  const _packet = createSelectiveAckPacket(
    socket.seqNr,
    socket.sndConnectionId,
    socket.ackNr,
    socket.rtt_var,
    socket.cur_window,
    ackNrs
  )
  await socket.sendStatePacket(_packet)
}
