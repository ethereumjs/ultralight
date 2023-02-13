import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { randomBytes } from 'crypto'
import debug from 'debug'
import tape from 'tape'
import {
  PacketType,
  UtpSocket,
  UtpSocketType,
  HeaderExtension,
  fromHexString,
  toHexString,
  Packet,
  ConnectionState,
} from '../../../src/index.js'

const sampleSize = 50000
const peerId = await createSecp256k1PeerId()
const _peerId = await createSecp256k1PeerId()
const content = randomBytes(sampleSize)
const DEFAULT_RAND_SEQNR = 5555
const DEFAULT_RAND_ACKNR = 4444
const readId = 1111
const writeId = 2222

const _read = () =>
  new UtpSocket({
    ackNr: DEFAULT_RAND_ACKNR,
    seqNr: DEFAULT_RAND_SEQNR,
    remoteAddress: '1234',
    rcvId: readId,
    sndId: writeId,
    logger: debug('test'),
    type: UtpSocketType.READ,
  })
const _write = () =>
  new UtpSocket({
    ackNr: DEFAULT_RAND_ACKNR,
    seqNr: DEFAULT_RAND_SEQNR,
    remoteAddress: '1234',
    rcvId: writeId,
    sndId: readId,
    logger: debug('test'),
    type: UtpSocketType.WRITE,
    content: content,
  })
tape('socket constructor', (t) => {
  const read = _read()
  const write = _write()
  t.test('Read Socket', (st) => {
    st.equal(read.type, UtpSocketType.READ, 'Socket type correctly updated to READ')
    st.equal(read.sndConnectionId, writeId, 'Socket sndId correctly updated to 2')
    st.equal(read.rcvConnectionId, readId, 'Socket rcvId correctly updated to 1')
    st.equal(read.getSeqNr(), DEFAULT_RAND_SEQNR, 'Socket seqNr correctly updated to 5555')
    st.equal(read.ackNr, DEFAULT_RAND_ACKNR, 'Socket ackNr correctly updated to 4444')
    st.end()
  })
  t.test('Write Socket', (st) => {
    st.equal(write.type, UtpSocketType.WRITE, 'Socket type correctly updated to WRITE')
    st.equal(write.sndConnectionId, readId, 'Socket sndId correctly updated to 2')
    st.equal(write.rcvConnectionId, writeId, 'Socket rcvId correctly updated to 1')
    st.equal(write.getSeqNr(), DEFAULT_RAND_SEQNR, 'Socket seqNr correctly updated to 5555')
    st.equal(write.ackNr, DEFAULT_RAND_ACKNR, 'Socket ackNr correctly updated to 4444')
    st.deepEqual(write.content, content, 'Socket content correctly updated')
    st.end()
  })
})

tape('createPacket()', (t) => {
  const read = _read()
  const write = _write()
  t.test('SYN', (st) => {
    const read_syn = read.createPacket({ pType: PacketType.ST_SYN })
    st.equal(read_syn.header.pType, PacketType.ST_SYN, 'Packet type correctly set to ST_SYN')
    st.equal(read_syn.header.version, 1, 'Packet version correctly set to 1')
    st.equal(read_syn.header.extension, HeaderExtension.none, 'SYN Packet extension should be none')
    st.equal(read_syn.header.connectionId, write.sndConnectionId, 'Packet sndId correctly set')
    st.equal(read_syn.header.seqNr, read.getSeqNr(), 'Packet seqNr correctly set')
    st.equal(read_syn.header.ackNr, read.ackNr, 'Packet ackNr correctly set')
    st.equal(read_syn.size, 20, 'SYN Packet size should be 20')

    const write_syn = write.createPacket({ pType: PacketType.ST_SYN })
    st.equal(write_syn.header.pType, PacketType.ST_SYN, 'Packet type correctly set to ST_SYN')
    st.equal(write_syn.header.version, 1, 'Packet version correctly set to 1')
    st.equal(
      write_syn.header.extension,
      HeaderExtension.none,
      'SYN Packet extension should be none'
    )
    st.equal(write_syn.header.connectionId, read.sndConnectionId, 'Packet sndId correctly set')
    st.equal(write_syn.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    st.equal(write_syn.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    st.equal(write_syn.size, 20, 'SYN Packet size should be 20')

    st.end()
  })

  t.test('STATE', (st) => {
    const read_state = read.createPacket({ pType: PacketType.ST_STATE })
    st.equal(read_state.header.pType, PacketType.ST_STATE, 'Packet type correctly set to ST_STATE')
    st.equal(read_state.header.version, 1, 'Packet version correctly set to 1')
    st.equal(
      read_state.header.extension,
      HeaderExtension.none,
      'STATE Packet extension should be none'
    )
    st.equal(read_state.header.connectionId, write.sndConnectionId, 'Packet sndId correctly set')
    st.equal(read_state.header.seqNr, read.getSeqNr(), 'Packet seqNr correctly set')
    st.equal(read_state.header.ackNr, read.ackNr, 'Packet ackNr correctly set')
    st.equal(read_state.size, 20, 'STATE Packet size should be 20')

    const write_state = write.createPacket({ pType: PacketType.ST_STATE })

    st.equal(write_state.header.pType, PacketType.ST_STATE, 'Packet type correctly set to ST_STATE')
    st.equal(write_state.header.version, 1, 'Packet version correctly set to 1')
    st.equal(
      write_state.header.extension,
      HeaderExtension.none,
      'STATE Packet extension should be none'
    )
    st.equal(write_state.header.connectionId, read.sndConnectionId, 'Packet sndId correctly set')
    st.equal(write_state.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    st.equal(write_state.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    st.equal(write_state.size, 20, 'STATE Packet size should be 20')

    st.end()
  })

  t.test('FIN', (st) => {
    const write_fin = write.createPacket({ pType: PacketType.ST_FIN })
    st.equal(write_fin.header.pType, PacketType.ST_FIN, 'Packet type correctly set to ST_FIN')
    st.equal(write_fin.header.version, 1, 'Packet version correctly set to 1')
    st.equal(
      write_fin.header.extension,
      HeaderExtension.none,
      'FIN Packet extension should be none'
    )
    st.equal(write_fin.header.connectionId, read.sndConnectionId, 'Packet sndId correctly set')
    st.equal(write_fin.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    st.equal(write_fin.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    st.equal(write_fin.size, 20, 'FIN Packet size should be 20')

    st.end()
  })

  t.test('RESET', (st) => {
    const read_reset = read.createPacket({ pType: PacketType.ST_RESET })
    st.equal(read_reset.header.pType, PacketType.ST_RESET, 'Packet type correctly set to ST_RESET')
    st.equal(read_reset.header.version, 1, 'Packet version correctly set to 1')
    st.equal(
      read_reset.header.extension,
      HeaderExtension.none,
      'RESET Packet extension should be none'
    )
    st.equal(read_reset.header.connectionId, write.sndConnectionId, 'Packet sndId correctly set')
    st.equal(read_reset.header.seqNr, read.getSeqNr(), 'Packet seqNr correctly set')
    st.equal(read_reset.header.ackNr, read.ackNr, 'Packet ackNr correctly set')
    st.equal(read_reset.size, 20, 'RESET Packet size should be 20')

    const write_reset = write.createPacket({ pType: PacketType.ST_RESET })
    st.equal(write_reset.header.pType, PacketType.ST_RESET, 'Packet type correctly set to ST_RESET')
    st.equal(write_reset.header.version, 1, 'Packet version correctly set to 1')
    st.equal(
      write_reset.header.extension,
      HeaderExtension.none,
      'RESET Packet extension should be none'
    )
    st.equal(write_reset.header.connectionId, read.sndConnectionId, 'Packet sndId correctly set')
    st.equal(write_reset.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    st.equal(write_reset.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    st.equal(write_reset.size, 20, 'RESET Packet size should be 20')

    st.end()
  })

  t.test('DATA', (st) => {
    const write_data = write.createPacket({
      pType: PacketType.ST_DATA,
      payload: fromHexString('0x1234'),
    })
    st.equal(write_data.header.pType, PacketType.ST_DATA, 'Packet type correctly set to ST_DATA')
    st.equal(write_data.header.version, 1, 'Packet version correctly set to 1')
    st.equal(
      write_data.header.extension,
      HeaderExtension.none,
      'DATA Packet extension should be none'
    )
    st.equal(write_data.header.connectionId, read.sndConnectionId, 'Packet sndId correctly set')
    st.equal(write_data.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    st.equal(write_data.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    st.equal(
      toHexString(write_data.payload!),
      '0x1234',
      'DATA Packet payload correctly set to undefined'
    )
    st.equal(write_data.size, 20 + fromHexString('0x1234').length, 'DATA Packet size should be 20')

    st.end()
  })
  t.end()
})

tape('sendPacket()', async (t) => {
  const read = _read()
  const write = _write()
  const test = async (
    socket: UtpSocket,
    testFunction: (...args: any) => Promise<void>,
    expected: any,
    ...args: any
  ) => {
    socket.once('send', (remoteAddr, msg) => {
      socket.emit('sent')
      t.equal(Packet.fromBuffer(msg).header.pType, expected, 'Packet type correctly set')
    })
    await testFunction.bind(socket)(...args)
  }
  await test(read, read.sendSynPacket, PacketType.ST_SYN)
  t.equal(read.state, ConnectionState.SynSent, 'Socket state correctly set to SYN_SENT')
  await test(read, read.sendSynAckPacket, PacketType.ST_STATE)
  t.equal(read.state, ConnectionState.SynRecv, 'Socket state correctly set to SYN_RECV')
  await test(read, read.sendDataPacket, PacketType.ST_DATA, fromHexString('0x1234'))
  t.equal(read.state, ConnectionState.Connected, 'Socket state correctly set to CONNECTED')
  await test(read, read.sendAckPacket, PacketType.ST_STATE, Uint8Array.from([1, 0, 0, 128]))
  await test(read, read.sendFinPacket, PacketType.ST_FIN)

  await test(write, write.sendSynPacket, PacketType.ST_SYN)
  t.equal(write.state, ConnectionState.SynSent, 'Socket state correctly set to SYN_SENT')
  await test(write, write.sendSynAckPacket, PacketType.ST_STATE)
  t.equal(write.state, ConnectionState.SynRecv, 'Socket state correctly set to SYN_RECV')
  await test(write, write.sendDataPacket, PacketType.ST_DATA), fromHexString('0x1234')
  t.equal(write.state, ConnectionState.Connected, 'Socket state correctly set to CONNECTED')
  await test(write, write.sendAckPacket, PacketType.ST_STATE, Uint8Array.from([1, 0, 0, 128]))
  await test(write, write.sendFinPacket, PacketType.ST_FIN)

  t.end()
})

tape('handle()', async (t) => {
  const read = _read()
  const write = _write()
  const test = async (
    socket: UtpSocket,
    testFunction: (...args: any) => Promise<any>,
    expected: any,
    ...args: any
  ) => {
    socket.once('send', (remoteAddr, msg) => {
      socket.emit('sent')
      t.equal(
        Packet.fromBuffer(msg).header.pType,
        expected,
        'Packet type handled with correct response Packet type'
      )
    })
    await testFunction.bind(socket)(...args)
  }

  await test(read, read.handleSynPacket, PacketType.ST_STATE)
  t.equal(read.state, ConnectionState.SynRecv, 'Socket state correctly set to SYN_RECV')
  await test(read, read.handleStatePacket, PacketType.ST_STATE, 1)
  await test(
    read,
    read.handleDataPacket,
    PacketType.ST_STATE,
    write.createPacket({ pType: PacketType.ST_DATA, payload: fromHexString('0x1234') })
  )
  t.equal(read.state, ConnectionState.Connected, 'Socket state updated to CONNECTED')
  await test(
    read,
    read.handleFinPacket,
    PacketType.ST_STATE,
    write.createPacket({ pType: PacketType.ST_FIN })
  )
  t.equal(read.state, ConnectionState.GotFin, 'Socket state updated to GOT_FIN')
  await test(write, write.handleSynPacket, PacketType.ST_STATE)
  t.equal(write.state, ConnectionState.SynRecv, 'Socket state correctly set to SYN_RECV')
  write.finNr = 3
  await write.handleStatePacket(3)
  t.equal(write.state, ConnectionState.Closed, 'Socket state updated to CLOSED')

  t.end()
})

// tape('uTP Socket Tests', (t) => {
//   const s = _write()
//   s.logger = debug('test')
//   s.content = Uint8Array.from([111, 222])
//   s.setWriter()
//   t.test('socket.compare()', (st) => {
//     s.ackNrs = [0, 1, 2, 3, 4, 5]
//     s.writer!.dataNrs = [0, 1, 2, 3, 4, 5]
//     st.ok(s.compare(), 'socket.compare() returns true for matching ackNrs and dataNrs')
//     s.writer!.dataNrs = [0, 1, 2, 3, 4, 5, 6]
//     st.notOk(s.compare(), 'socket.compare() returns false for mismatched ackNrs and dataNrs')
//     s.ackNrs = [0, 1, 2, 3, 4, 6, 5]
//     st.ok(
//       s.compare(),
//       'socket.compare() returns true for matching but out of order ackNrs and dataNrs'
//     )
//     st.end()
//   })
//   t.test('socket.updateRtt()', (st) => {
//     const delay = 100
//     s.packetManager.congestionControl.rtt = delay
//     s.packetManager.congestionControl.rtt_var = 0
//     s.packetManager.congestionControl.updateRTT(delay)
//     st.deepEqual(
//       s.packetManager.congestionControl.rtt,
//       delay,
//       'socket.rtt should not change if packet rtt_var remains 0.'
//     )
//     s.packetManager.congestionControl.updateRTT(delay - 8)
//     st.deepEqual(
//       s.packetManager.congestionControl.rtt,
//       delay - 1,
//       'should correctly update RTT with from packet rtt value'
//     )
//     s.packetManager.congestionControl.updateRTT(delay + 9)
//     st.deepEqual(
//       s.packetManager.congestionControl.rtt,
//       delay,
//       'should correctly update RTT with from packet rtt value'
//     )
//     s.packetManager.congestionControl.updateRTT(delay + 8)
//     st.deepEqual(
//       s.packetManager.congestionControl.rtt,
//       delay + 1,
//       'should correctly update RTT with from packet rtt value'
//     )
//     s.packetManager.congestionControl.updateRTT(delay - 7)
//     st.deepEqual(
//       s.packetManager.congestionControl.rtt,
//       delay,
//       'should correctly update RTT with from packet rtt value'
//     )
//     st.end()
//   })
// })

// tape('FIND/FOUND Socket Tests', (t) => {
//   const logger = debug('uTP-')
//   const uTP = new PortalNetworkUTP(logger)
//   const foundSocket = uTP.createPortalNetworkUTPSocket(
//     RequestCode.FOUNDCONTENT_WRITE,
//     peerId.toString(),
//     1234,
//     5678,
//     content
//   )
//   const findSocket = uTP.createPortalNetworkUTPSocket(
//     RequestCode.FINDCONTENT_READ,
//     _peerId.toString(),
//     5678,
//     1234
//   )
//   const synPacket = findSocket.createPacket<PacketType.ST_SYN>()

//   t.test('Packet Sending/Handling', async (st) => {
//     findSocket.reader = await uTP.createNewReader(findSocket, 2)
//     await findSocket.sendSynPacket()
//     st.equal(findSocket.state, ConnectionState.SynSent, 'Socket state correctly updated to SynSent')
//     foundSocket.ackNr = synPacket.header.seqNr
//     foundSocket.seqNr = DEFAULT_RAND_SEQNR
//     foundSocket.setWriter()

//     const synAck = await foundSocket.handleSynPacket()
//     const _synAck = Packet.fromOpts<PacketType.ST_STATE>({
//       header: {
//         pType: PacketType.ST_STATE,
//         seqNr: DEFAULT_RAND_SEQNR,
//         connectionId: foundSocket.sndConnectionId,
//         ackNr: synPacket.header.seqNr,
//         timestampMicroseconds: synAck.header.timestampMicroseconds,
//         timestampDifferenceMicroseconds: foundSocket.reply_micro,
//         wndSize: (foundSocket.max_window - foundSocket.cur_window) % 2 ** 32,
//       },
//     })
//     st.deepEqual(synAck, _synAck, `Socket correctly hanldes SYN packet with STATE (Syn-Ack) packet`)
//     st.equal(
//       foundSocket.state,
//       ConnectionState.SynRecv,
//       `Socket correctly updates state from SYN packet`
//     )
//     const startingSeqNr = findSocket.seqNr + 1
//     findSocket.ackNr = synAck.header.seqNr
//     findSocket.seqNr = 2
//     const reader = await uTP.createNewReader(findSocket, startingSeqNr)
//     findSocket.reader = reader
//     await findSocket.handleStatePacket(synAck)
//     st.equal(findSocket.state, ConnectionState.Connected, 'Socket state is Connected')
//     const chunks = foundSocket.writer.chunk()
//     const packets = Object.values(chunks).map((chunk, idx) => {
//       const packet = Packet.fromOpts(PacketType.ST_DATA, {
//         seqNr: 2 + idx,
//         connectionId: foundSocket.sndConnectionId,
//         ackNr: foundSocket.ackNr + idx,
//         payload: chunk,
//         timestampMicroseconds: Bytes32TimeStamp(),
//         timestampDifferenceMicroseconds: foundSocket.reply_micro,
//         wndSize: (foundSocket.max_window - foundSocket.cur_window) % 2 ** 32,
//       })
//       return packet
//     })

//     const returnPacket = await foundSocket.sendDataPacket(packets[0])
//     st.equal(foundSocket.state, ConnectionState.Connected, 'Socket state is Connected')
//     st.equal(
//       returnPacket.header.seqNr,
//       packets[0].header.seqNr,
//       'Socket successfully sent Data Packet'
//     )
//     const ack = (await findSocket.handleDataPacket(packets[0])) as Packet
//     st.equal(findSocket.state, ConnectionState.Connected, 'Socket state is Connected')
//     st.equal(ack.header.pType, PacketType.ST_STATE, 'Socket Handles Data Packet by creating Ack')
//     await foundSocket.handleStatePacket(ack)
//     const dataNrs = packets.map((pack) => {
//       return pack.header.seqNr
//     })
//     packets.slice(1, packets.length - 1).forEach(async (packet) => {
//       await findSocket.handleDataPacket(packet)
//     })
//     foundSocket.dataNrs = dataNrs
//     foundSocket.ackNrs = dataNrs
//     const lastAck = (await findSocket.handleDataPacket(packets[packets.length - 1])) as Packet
//     const handled = await foundSocket.handleStatePacket(lastAck)

//     st.ok(handled)
//     st.equal(
//       packets.length,
//       findSocket.reader!.packets.length,
//       'Socket correctly handled Data Packets'
//     )

//     const finPacket = Packet.fromOpts(PacketType.ST_FIN, {
//       seqNr: 100,
//       connectionId: foundSocket.sndConnectionId,
//       ackNr: foundSocket.ackNr + 98,
//       timestampMicroseconds: Bytes32TimeStamp(),
//       timestampDifferenceMicroseconds: 0,
//       wndSize: 1024,
//     })
//     const finAck = Packet.fromOpts(PacketType.ST_STATE, {
//       seqNr: finPacket.header.ackNr + 1,
//       connectionId: findSocket.sndConnectionId,
//       ackNr: 100,
//       timestampMicroseconds: Bytes32TimeStamp(),
//       timestampDifferenceMicroseconds: 0,
//       wndSize: 1024,
//     })
//     const encoded = await foundSocket.sendFinPacket(finPacket)
//     st.deepEqual(
//       Packet.fromBuffer(encoded).header,
//       finPacket.header,
//       `Socket successfully sent Fin Packet`
//     )
//     const _compiled = await findSocket.handleFinPacket(finPacket)

//     st.deepEqual(Buffer.from(_compiled!), content, `Socket correctly handled Fin Packet`)
//     st.equal(
//       findSocket.state,
//       ConnectionState.GotFin,
//       `Socket correctly updated state from Fin Packet`
//     )

//     await foundSocket.handleStatePacket(finAck)
//     st.equal(foundSocket.state, ConnectionState.Closed, 'Socket closed after FinAck')

//     t.test('socket.handleResetPacket()', async (st) => {
//       const reset = Packet.fromOpts(PacketType.ST_RESET, {
//         seqNr: 1,
//         connectionId: findSocket.sndConnectionId,
//         ackNr: DEFAULT_RAND_ACKNR,
//         timestampMicroseconds: Bytes32TimeStamp(),
//         timestampDifferenceMicroseconds: findSocket.reply_micro,
//         wndSize: (findSocket.max_window - findSocket.cur_window) % 2 ** 32,
//       })
//       await findSocket.sendResetPacket(reset)
//       st.equal(
//         findSocket.state,
//         ConnectionState.Reset,
//         'Sending RESET packet updates state to RESET'
//       )
//     })

//     st.end()
//   })
// })

// tape('OFFER/ACCEPT Socket Tests', (t) => {
//   const logger = debug('uTP-')
//   const uTP = new PortalNetworkUTP(logger)
//   const offerSocket = uTP.createPortalNetworkUTPSocket(
//     RequestCode.OFFER_WRITE,
//     peerId.toString(),
//     1234,
//     5678,
//     content
//   )
//   const acceptSocket = uTP.createPortalNetworkUTPSocket(
//     RequestCode.ACCEPT_READ,
//     _peerId.toString(),
//     5678,
//     1234
//   )
//   const synPacket = Packet.fromOpts(PacketType.ST_SYN, {
//     seqNr: 1,
//     connectionId: offerSocket.sndConnectionId,
//     ackNr: DEFAULT_RAND_ACKNR,
//     timestampMicroseconds: Bytes32TimeStamp(),
//     timestampDifferenceMicroseconds: offerSocket.reply_micro,
//     wndSize: (offerSocket.max_window - offerSocket.cur_window) % 2 ** 32,
//   })

//   t.test('Packet Sending/Handling', async (st) => {
//     const writer = await offerSocket.utp.createNewWriter(offerSocket, 2)
//     const chunks = writer.chunk()
//     const packets = Object.values(chunks).map((chunk, idx) => {
//       const packet = Packet.fromOpts(PacketType.ST_DATA, {
//         seqNr: 2 + idx,
//         connectionId: offerSocket.sndConnectionId,
//         ackNr: offerSocket.ackNr + idx,
//         payload: chunk,
//         timestampMicroseconds: Bytes32TimeStamp(),
//         timestampDifferenceMicroseconds: offerSocket.reply_micro,
//         wndSize: (offerSocket.max_window - offerSocket.cur_window) % 2 ** 32,
//       })
//       return packet
//     })
//     acceptSocket.reader = await acceptSocket.utp.createNewReader(acceptSocket, 2)
//     await offerSocket.sendSynPacket(synPacket)
//     st.equal(
//       offerSocket.state,
//       ConnectionState.SynSent,
//       'Socket state correctly updated to SynSent'
//     )
//     acceptSocket.ackNr = synPacket.header.seqNr
//     acceptSocket.reader = await uTP.createNewReader(acceptSocket, 2)
//     const synAck = await acceptSocket.handleSynPacket()
//     st.equal(
//       acceptSocket.state,
//       ConnectionState.SynRecv,
//       `Socket correctly updates state from SYN packet`
//     )
//     const _synAck = Packet.fromOpts(PacketType.ST_STATE, {
//       seqNr: acceptSocket.seqNr,
//       connectionId: acceptSocket.sndConnectionId,
//       ackNr: 1,
//       timestampMicroseconds: synAck.header.timestampMicroseconds,
//       timestampDifferenceMicroseconds: acceptSocket.reply_micro,
//       wndSize: (acceptSocket.max_window - acceptSocket.cur_window) % 2 ** 32,
//     })
//     st.deepEqual(synAck, _synAck, `Socket correctly hanldes SYN packet with STATE (Syn-Ack) packet`)
//     await offerSocket.handleStatePacket(synAck)
//     st.equal(offerSocket.state, ConnectionState.Connected, 'Socket state is Connected')
//     const seqNr = await (await offerSocket.sendDataPacket(packets[0])).header.seqNr
//     st.equal(seqNr, 2, 'Socket successfully sent Data Packet')
//     const ack = (await acceptSocket.handleDataPacket(packets[0])) as Packet
//     st.equal(acceptSocket.state, ConnectionState.Connected, 'Socket state is Connected')
//     st.equal(ack.header.pType, PacketType.ST_STATE, 'Socket Handles Data Packet by creating Ack')
//     await offerSocket.handleStatePacket(ack)
//     const dataNrs = packets.map((pack) => {
//       return pack.header.seqNr
//     })
//     packets.slice(1, packets.length - 1).forEach(async (packet) => {
//       await acceptSocket.handleDataPacket(packet)
//     })
//     offerSocket.dataNrs = dataNrs
//     offerSocket.ackNrs = dataNrs
//     const lastAck = (await acceptSocket.handleDataPacket(packets[packets.length - 1])) as Packet
//     const handled = await offerSocket.handleStatePacket(lastAck)

//     st.equal(offerSocket.dataNrs, dataNrs)
//     st.equal(offerSocket.ackNrs, dataNrs)
//     st.ok(handled)
//     st.equal(
//       packets.length,
//       acceptSocket.reader!.packets.length,
//       'Socket correctly handled Data Packets'
//     )

//     const finPacket = Packet.fromOpts(PacketType.ST_FIN, {
//       seqNr: 100,
//       connectionId: offerSocket.sndConnectionId,
//       ackNr: offerSocket.ackNr + 98,
//       timestampMicroseconds: Bytes32TimeStamp(),
//       timestampDifferenceMicroseconds: offerSocket.reply_micro,
//       wndSize: (offerSocket.max_window - offerSocket.cur_window) % 2 ** 32,
//     })
//     const finAck = Packet.fromOpts(PacketType.ST_STATE, {
//       seqNr: finPacket.header.ackNr + 1,
//       connectionId: offerSocket.sndConnectionId,
//       ackNr: 100,
//       timestampMicroseconds: Bytes32TimeStamp(),
//       timestampDifferenceMicroseconds: offerSocket.reply_micro,
//       wndSize: (offerSocket.max_window - offerSocket.cur_window) % 2 ** 32,
//     })
//     const encoded = await offerSocket.sendFinPacket(finPacket)
//     st.deepEqual(
//       Packet.fromBuffer(encoded).header,
//       finPacket.header,
//       `Socket successfully sent Fin Packet`
//     )
//     const _compiled = await acceptSocket.handleFinPacket(finPacket)
//     st.deepEqual(Buffer.from(_compiled!), content, `Socket correctly handled Fin Packet`)
//     st.equal(
//       acceptSocket.state,
//       ConnectionState.GotFin,
//       `Socket correctly updated state from Fin Packet`
//     )

//     await offerSocket.handleStatePacket(finAck)
//     st.equal(offerSocket.state, ConnectionState.Closed, 'Socket closed after FinAck')
//     st.end()
//   })

//   t.test('send reset packet', async (st) => {
//     const reset = Packet.fromOpts(PacketType.ST_RESET, {
//       seqNr: 1,
//       connectionId: offerSocket.sndConnectionId,
//       ackNr: DEFAULT_RAND_ACKNR,
//       timestampMicroseconds: Bytes32TimeStamp(),
//       timestampDifferenceMicroseconds: offerSocket.reply_micro,
//       wndSize: (offerSocket.max_window - offerSocket.cur_window) % 2 ** 32,
//     })
//     await offerSocket.sendResetPacket(reset)
//     st.equal(
//       offerSocket.state,
//       ConnectionState.Reset,
//       'Sending RESET packet updates state to RESET'
//     )
//     st.end()
//   })
// })
