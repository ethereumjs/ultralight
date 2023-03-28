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
  ProtocolId,
} from '../../../src/index.js'

const sampleSize = 50000
const content = randomBytes(sampleSize)
const DEFAULT_RAND_SEQNR = 5555
const DEFAULT_RAND_ACKNR = 4444
const readId = 1111
const writeId = 2222

const _read = (protocolId: ProtocolId) =>
  new UtpSocket({
    protocolId: protocolId,
    ackNr: DEFAULT_RAND_ACKNR,
    seqNr: DEFAULT_RAND_SEQNR,
    remoteAddress: '1234',
    rcvId: readId,
    sndId: writeId,
    logger: debug('test'),
    type: UtpSocketType.READ,
  })
const _write = (protocolId: ProtocolId) =>
  new UtpSocket({
    protocolId: protocolId,
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
  const read = _read(ProtocolId.HistoryNetwork)
  const write = _write(ProtocolId.HistoryNetwork)
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
  const read = _read(ProtocolId.HistoryNetwork)
  const write = _write(ProtocolId.HistoryNetwork)
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
  const read = _read(ProtocolId.HistoryNetwork)
  const write = _write(ProtocolId.HistoryNetwork)
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
  const read = _read(ProtocolId.HistoryNetwork)
  const write = _write(ProtocolId.HistoryNetwork)
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
  await write.handleStatePacket(3, 1000)
  t.equal(write.state, ConnectionState.Closed, 'Socket state updated to CLOSED')

  t.end()
})

tape('uTP Socket Tests', (t) => {
  const s = _write(ProtocolId.HistoryNetwork)
  s.logger = debug('test')
  s.content = Uint8Array.from([111, 222])
  s.setWriter(s.getSeqNr())
  t.test('socket.compare()', (st) => {
    s.ackNrs = [0, 1, 2, 3, 4, 5]
    s.writer!.dataNrs = [0, 1, 2, 3, 4, 5]
    st.ok(s.compare(), 'socket.compare() returns true for matching ackNrs and dataNrs')
    s.writer!.dataNrs = [0, 1, 2, 3, 4, 5, 6]
    st.notOk(s.compare(), 'socket.compare() returns false for mismatched ackNrs and dataNrs')
    s.ackNrs = [0, 1, 2, 3, 4, 6, 5]
    st.ok(
      s.compare(),
      'socket.compare() returns true for matching but out of order ackNrs and dataNrs'
    )
    st.end()
  })
  t.test('socket.updateRtt()', (st) => {
    const delay = 100
    s.packetManager.congestionControl.outBuffer.set(1, 1000)
    s.packetManager.congestionControl.outBuffer.set(2, 2000)
    s.packetManager.congestionControl.outBuffer.set(3, 3000)
    s.packetManager.congestionControl.outBuffer.set(4, 4000)
    s.packetManager.congestionControl.outBuffer.set(5, 5000)
    s.packetManager.congestionControl.rtt = delay
    s.packetManager.congestionControl.rtt_var = 0
    s.packetManager.congestionControl.updateRTT(1100, 1)
    st.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay,
      'socket.rtt should not change if packet rtt_var remains 0.'
    )
    s.packetManager.congestionControl.updateRTT(2092, 2)
    st.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay - 1,
      'should correctly update RTT with from packet rtt value'
    )
    s.packetManager.congestionControl.updateRTT(3108, 3)
    st.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay,
      'should correctly update RTT with from packet rtt value'
    )
    s.packetManager.congestionControl.updateRTT(4108, 4)
    st.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay + 1,
      'should correctly update RTT with from packet rtt value'
    )
    s.packetManager.congestionControl.updateRTT(5093, 5)
    st.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay,
      'should correctly update RTT with from packet rtt value'
    )
    st.end()
  })
})
