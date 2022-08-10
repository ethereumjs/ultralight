import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { randomBytes } from 'crypto'
import debug from 'debug'
import tape from 'tape'
import { ConnectionState, Packet, PacketType, UtpSocket } from '../../../src/wire/utp/index.js'
import {
  PortalNetworkUTP,
  RequestCode,
} from '../../../src/wire/utp/PortalNetworkUtp/PortalNetworkUTP.js'

const sampleSize = 50000
const peerId = await createSecp256k1PeerId()
const _peerId = await createSecp256k1PeerId()
const content = randomBytes(sampleSize)
const DEFAULT_RAND_SEQNR = 5555
const DEFAULT_RAND_ACKNR = 4444

tape('uTP Socket Tests', (t) => {
  const s = UtpSocket.prototype
  t.test('socket.compare()', (st) => {
    s.ackNrs = [0, 1, 2, 3, 4, 5]
    s.dataNrs = [0, 1, 2, 3, 4, 5]
    st.ok(s.compare(), 'socket.compare() returns true for matching ackNrs and dataNrs')
    s.dataNrs = [0, 1, 2, 3, 4, 5, 6]
    st.notOk(s.compare(), 'socket.compare() returns false for mismatched ackNrs and dataNrs')
    s.ackNrs = [0, 1, 2, 3, 4, 6, 5]
    st.ok(
      s.compare(),
      'socket.compare() returns true for matching but out of order ackNrs and dataNrs'
    )
    st.end()
  })
  t.test('socket.updateRtt()', (st) => {
    s.rtt = 100
    s.rtt_var = 0
    s.updateRTT(100)
    st.equal(s.rtt, 100, 'socket.rtt should not change if packet rtt_var remains 0.')
    s.updateRTT(92)
    st.equal(s.rtt, 99, 'should correctly update RTT with from packet rtt value')
    s.updateRTT(107)
    st.equal(s.rtt, 100, 'should correctly update RTT with from packet rtt value')
    s.updateRTT(108)
    st.equal(s.rtt, 101, 'should correctly update RTT with from packet rtt value')
    s.updateRTT(93)
    st.equal(s.rtt, 100, 'should correctly update RTT with from packet rtt value')
    st.end()
  })
})
tape('FIND/FOUND Socket Tests', (t) => {
  const logger = debug('uTP-')
  const uTP = new PortalNetworkUTP(logger)
  const foundSocket = uTP.createPortalNetworkUTPSocket(
    RequestCode.FOUNDCONTENT_WRITE,
    peerId.toString(),
    1234,
    5678,
    content
  )
  const findSocket = uTP.createPortalNetworkUTPSocket(
    RequestCode.FINDCONTENT_READ,
    _peerId.toString(),
    5678,
    1234
  )
  const synPacket = Packet.create(PacketType.ST_SYN, {
    seqNr: 1,
    sndConnectionId: findSocket.sndConnectionId,
    ackNr: DEFAULT_RAND_ACKNR,
    wndSize: findSocket.max_window,
    rtt_var: findSocket.rtt_var,
  })

  t.test('Packet Sending/Handling', async (st) => {
    findSocket.reader = await uTP.createNewReader(findSocket, 2)
    await findSocket.sendSynPacket(synPacket)
    st.equal(findSocket.state, ConnectionState.SynSent, 'Socket state correctly updated to SynSent')
    foundSocket.ackNr = synPacket.header.seqNr
    foundSocket.seqNr = DEFAULT_RAND_SEQNR
    foundSocket.writer = await uTP.createNewWriter(foundSocket, foundSocket.seqNr)

    const synAck = await foundSocket.handleSynPacket()
    const _synAck = Packet.create(PacketType.ST_STATE, {
      seqNr: DEFAULT_RAND_SEQNR,
      sndConnectionId: foundSocket.sndConnectionId,
      ackNr: synPacket.header.seqNr,
      rtt_var: foundSocket.rtt_var,
      wndSide: foundSocket.cur_window,
      timestamp: synAck.header.timestamp,
    })
    st.deepEqual(synAck, _synAck, `Socket correctly hanldes SYN packet with STATE (Syn-Ack) packet`)
    st.equal(
      foundSocket.state,
      ConnectionState.SynRecv,
      `Socket correctly updates state from SYN packet`
    )
    const startingSeqNr = findSocket.seqNr + 1
    findSocket.ackNr = synAck.header.seqNr
    findSocket.seqNr = 2
    findSocket.nextSeq = synAck.header.seqNr + 1
    findSocket.nextAck = synAck.header.ackNr + 1
    const reader = await uTP.createNewReader(findSocket, startingSeqNr)
    findSocket.reader = reader
    await findSocket.handleStatePacket(synAck)
    st.equal(findSocket.state, ConnectionState.Connected, 'Socket state is Connected')
    const chunks = foundSocket.writer.chunk()
    const packets = Object.values(chunks).map((chunk, idx) => {
      const packet = Packet.create(PacketType.ST_DATA, {
        seqNr: 2 + idx,
        sndConnectionId: foundSocket.sndConnectionId,
        ackNr: foundSocket.ackNr + idx,
        wndSize: foundSocket.max_window,
        payload: chunk,
        rtt_var: foundSocket.rtt_var,
      })
      return packet
    })

    const returnPacket = await foundSocket.sendDataPacket(packets[0])
    st.equal(foundSocket.state, ConnectionState.Connected, 'Socket state is Connected')
    st.equal(
      returnPacket.header.seqNr,
      packets[0].header.seqNr,
      'Socket successfully sent Data Packet'
    )
    const ack = await findSocket.handleDataPacket(packets[0])
    st.equal(findSocket.state, ConnectionState.Connected, 'Socket state is Connected')
    st.equal(ack.header.pType, PacketType.ST_STATE, 'Socket Handles Data Packet by creating Ack')
    await foundSocket.handleStatePacket(ack)
    st.equal(foundSocket.ackNrs.length, 1)
    const dataNrs = packets.map((pack) => {
      return pack.header.seqNr
    })
    packets.slice(1, packets.length - 1).forEach(async (packet) => {
      await findSocket.handleDataPacket(packet)
    })
    foundSocket.dataNrs = dataNrs
    foundSocket.ackNrs = dataNrs
    const lastAck = await findSocket.handleDataPacket(packets[packets.length - 1])
    const handled = await foundSocket.handleStatePacket(lastAck)

    st.ok(handled)
    st.equal(
      packets.length,
      findSocket.reader!.packets.length,
      'Socket correctly handled Data Packets'
    )

    const finPacket = Packet.create(PacketType.ST_FIN, {
      seqNr: 100,
      sndConnectionId: foundSocket.sndConnectionId,
      ackNr: foundSocket.ackNr + 98,
      wndSize: foundSocket.max_window,
      rtt_var: 0,
    })
    const finAck = Packet.create(PacketType.ST_STATE, {
      seqNr: finPacket.header.ackNr + 1,
      sndConnectionId: findSocket.sndConnectionId,
      ackNr: 100,
      rtt_var: findSocket.rtt_var,
      wndSize: findSocket.cur_window,
    })
    const encoded = await foundSocket.sendFinPacket(finPacket)
    st.deepEqual(
      Packet.bufferToPacket(encoded).header,
      finPacket.header,
      `Socket successfully sent Fin Packet`
    )
    const _compiled = await findSocket.handleFinPacket(finPacket)

    st.deepEqual(Buffer.from(_compiled!), content, `Socket correctly handled Fin Packet`)
    st.equal(
      findSocket.state,
      ConnectionState.GotFin,
      `Socket correctly updated state from Fin Packet`
    )

    await foundSocket.handleStatePacket(finAck)
    st.equal(foundSocket.state, ConnectionState.Closed, 'Socket closed after FinAck')

    t.test('socket.handleResetPacket()', async (st) => {
      const reset = Packet.create(PacketType.ST_RESET, {
        seqNr: 1,
        sndConnectionId: findSocket.sndConnectionId,
        ackNr: DEFAULT_RAND_ACKNR,
        wndSize: findSocket.max_window,
        rtt_var: findSocket.rtt_var,
      })
      await findSocket.sendResetPacket(reset)
      st.equal(
        findSocket.state,
        ConnectionState.Reset,
        'Sending RESET packet updates state to RESET'
      )
    })

    st.end()
  })
})

tape('OFFER/ACCEPT Socket Tests', (t) => {
  const logger = debug('uTP-')
  const uTP = new PortalNetworkUTP(logger)
  const offerSocket = uTP.createPortalNetworkUTPSocket(
    RequestCode.OFFER_WRITE,
    peerId.toString(),
    1234,
    5678,
    content
  )
  const acceptSocket = uTP.createPortalNetworkUTPSocket(
    RequestCode.ACCEPT_READ,
    _peerId.toString(),
    5678,
    1234
  )
  const synPacket = Packet.create(PacketType.ST_SYN, {
    seqNr: 1,
    sndConnectionId: offerSocket.sndConnectionId,
    ackNr: DEFAULT_RAND_ACKNR,
    wndSize: offerSocket.max_window,
    rtt_var: offerSocket.rtt_var,
  })

  t.test('Packet Sending/Handling', async (st) => {
    const writer = await offerSocket.utp.createNewWriter(offerSocket, 2)
    const chunks = writer.chunk()
    const packets = Object.values(chunks).map((chunk, idx) => {
      const packet = Packet.create(PacketType.ST_DATA, {
        seqNr: 2 + idx,
        sndConnectionId: offerSocket.sndConnectionId,
        ackNr: offerSocket.ackNr + idx,
        wndSize: offerSocket.max_window,
        payload: chunk,
        rtt_var: offerSocket.rtt_var,
      })
      return packet
    })
    acceptSocket.reader = await acceptSocket.utp.createNewReader(acceptSocket, 2)
    await offerSocket.sendSynPacket(synPacket)
    st.equal(
      offerSocket.state,
      ConnectionState.SynSent,
      'Socket state correctly updated to SynSent'
    )
    acceptSocket.ackNr = synPacket.header.seqNr
    acceptSocket.nextSeq = 2
    acceptSocket.reader = await uTP.createNewReader(acceptSocket, 2)
    const synAck = await acceptSocket.handleSynPacket()
    st.equal(
      acceptSocket.state,
      ConnectionState.SynRecv,
      `Socket correctly updates state from SYN packet`
    )
    const _synAck = Packet.create(PacketType.ST_STATE, {
      seqNr: acceptSocket.seqNr,
      sndConnectionId: acceptSocket.sndConnectionId,
      ackNr: 1,
      rtt_var: acceptSocket.rtt_var,
      wndSide: acceptSocket.cur_window,
      timestamp: synAck.header.timestamp,
    })
    st.deepEqual(synAck, _synAck, `Socket correctly hanldes SYN packet with STATE (Syn-Ack) packet`)
    await offerSocket.handleStatePacket(synAck)
    st.equal(offerSocket.state, ConnectionState.Connected, 'Socket state is Connected')
    const seqNr = await (await offerSocket.sendDataPacket(packets[0])).header.seqNr
    st.equal(seqNr, 2, 'Socket successfully sent Data Packet')
    const ack = await acceptSocket.handleDataPacket(packets[0])
    st.equal(acceptSocket.state, ConnectionState.Connected, 'Socket state is Connected')
    st.equal(ack.header.pType, PacketType.ST_STATE, 'Socket Handles Data Packet by creating Ack')
    await offerSocket.handleStatePacket(ack)
    st.equal(
      offerSocket.ackNrs.length,
      1,
      `OFFER Socket added first data ack to list ${offerSocket.ackNrs}`
    )
    const dataNrs = packets.map((pack) => {
      return pack.header.seqNr
    })
    packets.slice(1, packets.length - 1).forEach(async (packet) => {
      await acceptSocket.handleDataPacket(packet)
    })
    offerSocket.dataNrs = dataNrs
    offerSocket.ackNrs = dataNrs
    const lastAck = await acceptSocket.handleDataPacket(packets[packets.length - 1])
    const handled = await offerSocket.handleStatePacket(lastAck)

    st.equal(offerSocket.dataNrs, dataNrs)
    st.equal(offerSocket.ackNrs, dataNrs)
    st.ok(handled)
    st.equal(
      packets.length,
      acceptSocket.reader!.packets.length,
      'Socket correctly handled Data Packets'
    )

    const finPacket = Packet.create(PacketType.ST_FIN, {
      seqNr: 100,
      sndConnectionId: offerSocket.sndConnectionId,
      ackNr: offerSocket.ackNr + 98,
      wndSize: offerSocket.max_window,
      rtt_var: 0,
    })
    const finAck = Packet.create(PacketType.ST_STATE, {
      seqNr: finPacket.header.ackNr + 1,
      sndConnectionId: offerSocket.sndConnectionId,
      ackNr: 100,
      rtt_var: offerSocket.rtt_var,
      wndSize: offerSocket.cur_window,
    })
    const encoded = await offerSocket.sendFinPacket(finPacket)
    st.deepEqual(
      Packet.bufferToPacket(encoded).header,
      finPacket.header,
      `Socket successfully sent Fin Packet`
    )
    const _compiled = await acceptSocket.handleFinPacket(finPacket)
    st.deepEqual(Buffer.from(_compiled!), content, `Socket correctly handled Fin Packet`)
    st.equal(
      acceptSocket.state,
      ConnectionState.GotFin,
      `Socket correctly updated state from Fin Packet`
    )

    await offerSocket.handleStatePacket(finAck)
    st.equal(offerSocket.state, ConnectionState.Closed, 'Socket closed after FinAck')
    st.end()
  })

  t.test('send reset packet', async (st) => {
    const reset = Packet.create(PacketType.ST_RESET, {
      seqNr: 1,
      sndConnectionId: offerSocket.sndConnectionId,
      ackNr: DEFAULT_RAND_ACKNR,
      wndSize: offerSocket.max_window,
      rtt_var: offerSocket.rtt_var,
    })
    await offerSocket.sendResetPacket(reset)
    st.equal(
      offerSocket.state,
      ConnectionState.Reset,
      'Sending RESET packet updates state to RESET'
    )
    st.end()
  })
})
