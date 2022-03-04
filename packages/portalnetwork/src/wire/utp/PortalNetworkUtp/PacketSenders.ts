import {
  ConnectionState,
  createAckPacket,
  createDataPacket,
  createFinPacket,
  createResetPacket,
  createSelectiveAckPacket,
  createSynPacket,
  PacketType,
  _UTPSocket,
} from '..'

export async function sendSynPacket(socket: _UTPSocket): Promise<void> {
  const packet = createSynPacket(socket.rcvConnectionId, socket.seqNr++, socket.ackNr)
  socket.state = ConnectionState.SynSent
  await socket.sendPacket(packet, PacketType.ST_SYN)
}

export async function sendSynAckPacket(socket: _UTPSocket): Promise<void> {
  const packet = createAckPacket(
    socket.seqNr++,
    socket.sndConnectionId,
    socket.ackNr,
    socket.rtt_var,
    socket.cur_window
  )
  await socket.sendPacket(packet, PacketType.ST_STATE)
}
export async function sendDataPacket(socket: _UTPSocket, payload: Uint8Array): Promise<void> {
  const packet = createDataPacket(
    socket.seqNr++,
    socket.sndConnectionId,
    socket.ackNr,
    socket.max_window,
    payload,
    socket.rtt_var
  )
  socket.seqNrs.push(packet.header.seqNr)
  await socket.sendPacket(packet, PacketType.ST_DATA)
}
export async function sendAckPacket(socket: _UTPSocket): Promise<void> {
  const packet = createAckPacket(
    socket.seqNr++,
    socket.sndConnectionId,
    socket.ackNr,
    socket.rtt_var,
    socket.cur_window
  )
  await socket.sendPacket(packet, PacketType.ST_STATE)
}
export async function sendResetPacket(socket: _UTPSocket): Promise<void> {
  const packet = createResetPacket(socket.seqNr++, socket.sndConnectionId, socket.ackNr)
  await socket.sendPacket(packet, PacketType.ST_RESET)
}
export async function sendFinPacket(socket: _UTPSocket): Promise<void> {
  const packet = createFinPacket(
    socket.sndConnectionId,
    socket.seqNr,
    socket.ackNr,
    socket.cur_window
  )
  socket.finNr = packet.header.seqNr
  await socket.sendPacket(packet, PacketType.ST_FIN)
}
export async function sendSelectiveAckPacket(socket: _UTPSocket) {
  const received: number[] = socket.received
  const _packet = createSelectiveAckPacket(
    socket.seqNr++,
    socket.sndConnectionId,
    socket.ackNr,
    socket.rtt_var,
    socket.cur_window
  )
  await socket.sendPacket(_packet, PacketType.ST_STATE)
}
