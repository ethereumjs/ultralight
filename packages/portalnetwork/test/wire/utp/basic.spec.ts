import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { randomBytes } from 'crypto'
import debug from 'debug'
import tape from 'tape'
import { PortalNetworkUTP, RequestCode, BasicUtp, Packet, PacketType } from '../../../src/index.js'

const sampleSize = 50000
const peerId = await createSecp256k1PeerId()
const _peerId = await createSecp256k1PeerId()
const content = randomBytes(sampleSize)

tape('Basic uTP Tests', async (t) => {
  const logger = debug('uTP-')
  const basic = new BasicUtp()
  const uTP = new PortalNetworkUTP(logger)
  const socket = uTP.createPortalNetworkUTPSocket(
    RequestCode.FOUNDCONTENT_WRITE,
    peerId.toString(),
    1234,
    5678,
    content
  )
  const _socket = uTP.createPortalNetworkUTPSocket(
    RequestCode.FINDCONTENT_READ,
    _peerId.toString(),
    5678,
    1234
  )
  const writer = await socket.utp.createNewWriter(socket, 2)
  _socket.reader = await _socket.utp.createNewReader(_socket, 2)
  socket.seqNr = 2
  socket.ackNr = 1
  const chunks = writer.chunk()
  const packets = Object.values(chunks).map((chunk, idx) => {
    const packet = Packet.create(PacketType.ST_DATA, {
      seqNr: 2 + idx,
      sndConnectionId: _socket.sndConnectionId,
      ackNr: _socket.ackNr + idx,
      wndSize: _socket.max_window,
      payload: chunk,
      rtt_var: _socket.rtt_var,
    })
    return packet
  })
  t.test('senders/handlers', async (st) => {
    const syn = await basic.sendSynPacket(socket)
    const synPacket = Packet.create(PacketType.ST_SYN, {
      seqNr: 1,
      sndConnectionId: socket.sndConnectionId,
      ackNr: socket.ackNr,
      timestamp: syn.header.timestamp,
    })
    st.deepEqual(syn, synPacket, 'Basic Sends Syn Packet successfully')
    const _synAck = Packet.create(PacketType.ST_STATE, {
      seqNr: _socket.seqNr,
      sndConnectionId: _socket.sndConnectionId,
      ackNr: _socket.ackNr,
      rtt_var: _socket.rtt_var,
      wndSide: _socket.cur_window,
    })
    const synack = await basic.handleSynPacket(_socket, synPacket)
    ;(_synAck.header.timestamp = synack.header.timestamp),
      st.equal(
        (await basic.sendSynAckPacket(_socket)).header.pType,
        PacketType.ST_STATE,
        `Basic successfully sent a SynAck`
      )
    st.deepEqual(synack, _synAck, 'Basic handles Syn Packet correctly')
    st.doesNotThrow(async () => {
      await basic.handleSynAckPacket(socket, synack)
    }, 'Basic handles Syn Ack packet correctly')

    const dataPacket = await basic.sendDataPacket(socket, packets[0].payload)
    st.equal(
      dataPacket.header.seqNr,
      packets[0].header.seqNr,
      'Basic successfully sent Data Packet'
    )
    const ack = await basic.handleDataPacket(_socket, packets[0])
    st.equal(ack.header.pType, PacketType.ST_STATE, 'Basic Handles Data Packet by creating Ack')
    st.notOk(
      await basic.handleStatePacket(socket, ack),
      'Basic Handles State Packet (Non-Fin) correctly'
    )
    const dataNrs = packets.map((pack) => {
      return pack.header.seqNr
    })
    packets.slice(1, packets.length - 1).forEach(async (packet) => {
      await basic.handleDataPacket(_socket, packet)
    })
    socket.dataNrs = dataNrs
    socket.ackNrs = dataNrs
    const lastAck = await basic.handleDataPacket(_socket, packets[packets.length - 1])
    const handled = await basic.handleStatePacket(socket, lastAck)
    st.ok(handled)

    const _finAck = Packet.create(PacketType.ST_STATE, {
      seqNr: 98,
      sndConnectionId: _socket.sndConnectionId,
      ackNr: 100,
      rtt_var: _socket.rtt_var,
      wndSize: _socket.cur_window,
    })
    socket.seqNr = 100
    socket.ackNr = 98
    socket.finNr = 100
    const finReturn = await basic.sendFinPacket(socket)
    const finPacket = Packet.create(PacketType.ST_FIN, {
      seqNr: 100,
      sndConnectionId: socket.sndConnectionId,
      ackNr: 98,
      wndSize: socket.max_window,
      rtt_var: 0,
      timestamp: finReturn.header.timestamp,
    })
    st.deepEqual(finReturn.header, finPacket.header, `Basic successfully sent Fin Packet`)
    const _compiled = await basic.handleFinPacket(_socket, finPacket)

    st.deepEqual(Buffer.from(_compiled!), content, `Basic correctly handled Fin Packet`)

    socket.ackNrs = socket.dataNrs
    st.ok(await basic.handleStatePacket(socket, _finAck), 'Basic handles Fin Ack')

    const reset = await basic.sendResetPacket(socket)
    st.equal(reset.header.pType, PacketType.ST_RESET, 'Basic correctly handles Reset Packet')

    st.end()
  })
})
