import { randomBytes } from 'crypto'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import debug from 'debug'
import { assert, describe, it } from 'vitest'

import {
  // ConnectionState,
  HeaderExtension,
  NetworkId,
  // Packet,
  PacketType,
  PortalNetwork,
  PortalNetworkUTP,
  UtpSocketType,
} from '../../../src/index.js'
import { createUtpSocket } from '../../../src/wire/utp/Socket/index.js'

import type { ReadSocket } from '../../../src/wire/utp/Socket/ReadSocket.js'
import type { WriteSocket } from '../../../src/wire/utp/Socket/WriteSocket.js'

const sampleSize = 50000
const content = randomBytes(sampleSize)
const DEFAULT_RAND_SEQNR = 5555
const DEFAULT_RAND_ACKNR = 4444
const readId = 1111
const writeId = 2222

const _read = async (networkId: NetworkId): Promise<ReadSocket> => {
  const client = await PortalNetwork.create({ bindAddress: '127.0.0.1' })
  return createUtpSocket({
    utp: new PortalNetworkUTP(client),
    networkId,
    ackNr: DEFAULT_RAND_ACKNR,
    seqNr: DEFAULT_RAND_SEQNR,
    enr: 'enr:1234' as any,
    rcvId: readId,
    sndId: writeId,
    logger: debug('test'),
    type: UtpSocketType.READ,
  }) as ReadSocket
}
const _write = async (networkId: NetworkId, seqNr?: number): Promise<WriteSocket> => {
  const client = await PortalNetwork.create({ bindAddress: '127.0.0.1' })
  return createUtpSocket({
    utp: new PortalNetworkUTP(client),
    networkId,
    ackNr: DEFAULT_RAND_ACKNR,
    seqNr: seqNr ?? DEFAULT_RAND_SEQNR,
    enr: 'enr:1234' as any,
    rcvId: writeId,
    sndId: readId,
    logger: debug('test'),
    type: UtpSocketType.WRITE,
    content,
  }) as WriteSocket
}
describe('socket constructor', async () => {
  const read = await _read(NetworkId.HistoryNetwork)
  const write = await _write(NetworkId.HistoryNetwork)
  it('Read Socket', () => {
    assert.equal(read.type, UtpSocketType.READ, 'Socket type correctly updated to READ')
    assert.equal(read.sndConnectionId, writeId, 'Socket sndId correctly updated to 2')
    assert.equal(read.rcvConnectionId, readId, 'Socket rcvId correctly updated to 1')
    assert.equal(read.getSeqNr(), DEFAULT_RAND_SEQNR, 'Socket seqNr correctly updated to 5555')
    assert.equal(read.ackNr, DEFAULT_RAND_ACKNR, 'Socket ackNr correctly updated to 4444')
  })
  it('Write Socket', () => {
    assert.equal(write.type, UtpSocketType.WRITE, 'Socket type correctly updated to WRITE')
    assert.equal(write.sndConnectionId, readId, 'Socket sndId correctly updated to 2')
    assert.equal(write.rcvConnectionId, writeId, 'Socket rcvId correctly updated to 1')
    assert.equal(write.getSeqNr(), DEFAULT_RAND_SEQNR, 'Socket seqNr correctly updated to 5555')
    assert.equal(write.ackNr, DEFAULT_RAND_ACKNR, 'Socket ackNr correctly updated to 4444')
    assert.deepEqual(write.content, content, 'Socket content correctly updated')
  })
})

describe('createPacket()', async () => {
  const read = await _read(NetworkId.HistoryNetwork)
  const write = await _write(NetworkId.HistoryNetwork)
  it('SYN', () => {
    const read_syn = read.createPacket({ pType: PacketType.ST_SYN })
    assert.equal(read_syn.header.pType, PacketType.ST_SYN, 'Packet type correctly set to ST_SYN')
    assert.equal(read_syn.header.version, 1, 'Packet version correctly set to 1')
    assert.equal(
      read_syn.header.extension,
      HeaderExtension.none,
      'SYN Packet extension should be none',
    )
    assert.equal(read_syn.header.connectionId, write.sndConnectionId, 'Packet sndId correctly set')
    assert.equal(read_syn.header.seqNr, read.getSeqNr(), 'Packet seqNr correctly set')
    assert.equal(read_syn.header.ackNr, read.ackNr, 'Packet ackNr correctly set')
    assert.equal(read_syn.size, 20, 'SYN Packet size should be 20')

    const write_syn = write.createPacket({ pType: PacketType.ST_SYN })
    assert.equal(write_syn.header.pType, PacketType.ST_SYN, 'Packet type correctly set to ST_SYN')
    assert.equal(write_syn.header.version, 1, 'Packet version correctly set to 1')
    assert.equal(
      write_syn.header.extension,
      HeaderExtension.none,
      'SYN Packet extension should be none',
    )
    assert.equal(write_syn.header.connectionId, read.sndConnectionId, 'Packet sndId correctly set')
    assert.equal(write_syn.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    assert.equal(write_syn.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    assert.equal(write_syn.size, 20, 'SYN Packet size should be 20')
  })

  it('STATE', () => {
    const read_state = read.createPacket({ pType: PacketType.ST_STATE })
    assert.equal(
      read_state.header.pType,
      PacketType.ST_STATE,
      'Packet type correctly set to ST_STATE',
    )
    assert.equal(read_state.header.version, 1, 'Packet version correctly set to 1')
    assert.equal(
      read_state.header.extension,
      HeaderExtension.none,
      'STATE Packet extension should be none',
    )
    assert.equal(
      read_state.header.connectionId,
      write.sndConnectionId,
      'Packet sndId correctly set',
    )
    assert.equal(read_state.header.seqNr, read.getSeqNr(), 'Packet seqNr correctly set')
    assert.equal(read_state.header.ackNr, read.ackNr, 'Packet ackNr correctly set')
    assert.equal(read_state.size, 20, 'STATE Packet size should be 20')

    const write_state = write.createPacket({ pType: PacketType.ST_STATE })

    assert.equal(
      write_state.header.pType,
      PacketType.ST_STATE,
      'Packet type correctly set to ST_STATE',
    )
    assert.equal(write_state.header.version, 1, 'Packet version correctly set to 1')
    assert.equal(
      write_state.header.extension,
      HeaderExtension.none,
      'STATE Packet extension should be none',
    )
    assert.equal(
      write_state.header.connectionId,
      read.sndConnectionId,
      'Packet sndId correctly set',
    )
    assert.equal(write_state.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    assert.equal(write_state.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    assert.equal(write_state.size, 20, 'STATE Packet size should be 20')
  })

  it('FIN', () => {
    const write_fin = write.createPacket({ pType: PacketType.ST_FIN })
    assert.equal(write_fin.header.pType, PacketType.ST_FIN, 'Packet type correctly set to ST_FIN')
    assert.equal(write_fin.header.version, 1, 'Packet version correctly set to 1')
    assert.equal(
      write_fin.header.extension,
      HeaderExtension.none,
      'FIN Packet extension should be none',
    )
    assert.equal(write_fin.header.connectionId, read.sndConnectionId, 'Packet sndId correctly set')
    assert.equal(write_fin.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    assert.equal(write_fin.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    assert.equal(write_fin.size, 20, 'FIN Packet size should be 20')
  })

  it('RESET', () => {
    const read_reset = read.createPacket({ pType: PacketType.ST_RESET })
    assert.equal(
      read_reset.header.pType,
      PacketType.ST_RESET,
      'Packet type correctly set to ST_RESET',
    )
    assert.equal(read_reset.header.version, 1, 'Packet version correctly set to 1')
    assert.equal(
      read_reset.header.extension,
      HeaderExtension.none,
      'RESET Packet extension should be none',
    )
    assert.equal(
      read_reset.header.connectionId,
      write.sndConnectionId,
      'Packet sndId correctly set',
    )
    assert.equal(read_reset.header.seqNr, read.getSeqNr(), 'Packet seqNr correctly set')
    assert.equal(read_reset.header.ackNr, read.ackNr, 'Packet ackNr correctly set')
    assert.equal(read_reset.size, 20, 'RESET Packet size should be 20')

    const write_reset = write.createPacket({ pType: PacketType.ST_RESET })
    assert.equal(
      write_reset.header.pType,
      PacketType.ST_RESET,
      'Packet type correctly set to ST_RESET',
    )
    assert.equal(write_reset.header.version, 1, 'Packet version correctly set to 1')
    assert.equal(
      write_reset.header.extension,
      HeaderExtension.none,
      'RESET Packet extension should be none',
    )
    assert.equal(
      write_reset.header.connectionId,
      read.sndConnectionId,
      'Packet sndId correctly set',
    )
    assert.equal(write_reset.header.seqNr, write.getSeqNr(), 'Packet seqNr correctly set')
    assert.equal(write_reset.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    assert.equal(write_reset.size, 20, 'RESET Packet size should be 20')
  })

  it('DATA', () => {
    const write_data = write.createPacket({
      pType: PacketType.ST_DATA,
      payload: hexToBytes('0x1234'),
    })
    assert.equal(
      write_data.header.pType,
      PacketType.ST_DATA,
      'Packet type correctly set to ST_DATA',
    )
    assert.equal(write_data.header.version, 1, 'Packet version correctly set to 1')
    assert.equal(
      write_data.header.extension,
      HeaderExtension.none,
      'DATA Packet extension should be none',
    )
    assert.equal(write_data.header.connectionId, read.sndConnectionId, 'Packet sndId correctly set')
    assert.equal(write_data.header.seqNr, write.getSeqNr() - 1, 'Packet seqNr correctly set')
    assert.equal(write_data.header.ackNr, write.ackNr, 'Packet ackNr correctly set')
    assert.equal(
      bytesToHex(write_data.payload!),
      '0x1234',
      'DATA Packet payload correctly set to undefined',
    )
    assert.equal(write_data.size, 20 + hexToBytes('0x1234').length, 'DATA Packet size should be 20')
  })
})

// describe('sendPacket()', async () => {
//   const read = _read(NetworkId.HistoryNetwork)
//   const write = _write(NetworkId.HistoryNetwork)
//   const test = async (
//     socket: UtpSocket,
//     testFunction: (...args: any) => Promise<void>,
//     expected: any,
//     ...args: any
//   ) => {
//     socket.once('send', (remoteAddr, msg) => {
//       socket.emit('sent')
//       assert.equal(Packet.fromBuffer(msg).header.pType, expected, 'Packet type correctly set')
//     })
//     await testFunction.bind(socket)(...args)
//   }
//   it('should send correct packet type', async () => {
//     await test(read, read.sendSynPacket, PacketType.ST_SYN)
//     assert.equal(read.state, ConnectionState.SynSent, 'Socket state correctly set to SYN_SENT')
//     await test(read, read.sendSynAckPacket, PacketType.ST_STATE)
//     await test(read, read.sendDataPacket, PacketType.ST_DATA, hexToBytes('0x1234'))
//     assert.equal(read.state, ConnectionState.Connected, 'Socket state correctly set to CONNECTED')
//     await test(read, read.sendAckPacket, PacketType.ST_STATE, Uint8Array.from([1, 0, 0, 128]))
//     await test(read, read.sendFinPacket, PacketType.ST_FIN)

//     await test(write, write.sendSynPacket, PacketType.ST_SYN)
//     assert.equal(write.state, ConnectionState.SynSent, 'Socket state correctly set to SYN_SENT')
//     await test(write, write.sendSynAckPacket, PacketType.ST_STATE)
//     await test(write, write.sendDataPacket, PacketType.ST_DATA), hexToBytes('0x1234')
//     assert.equal(write.state, ConnectionState.Connected, 'Socket state correctly set to CONNECTED')
//     await test(write, write.sendAckPacket, PacketType.ST_STATE, Uint8Array.from([1, 0, 0, 128]))
//     await test(write, write.sendFinPacket, PacketType.ST_FIN)
//   })
// })

// describe('handle()', async () => {
//   const read = _read(NetworkId.HistoryNetwork)
//   const write = _write(NetworkId.HistoryNetwork)
//   const test = async (
//     socket: UtpSocket,
//     testFunction: (...args: any) => Promise<any>,
//     expected: any,
//     ...args: any
//   ) => {
//     socket.once('send', (remoteAddr, msg) => {
//       socket.emit('sent')
//       assert.equal(
//         PacketType[Packet.fromBuffer(msg).header.pType],
//         PacketType[expected],
//         'Packet type handled with correct response Packet type',
//       )
//     })
//     await testFunction.bind(socket)(...args)
//   }
//   it('should handle correct packet type', async () => {
//     await test(read, read.handleSynPacket, PacketType.ST_STATE)
//     assert.equal(read.state, ConnectionState.SynRecv, 'Socket state correctly set to SYN_RECV')
//     await test(read, read.handleStatePacket, PacketType.ST_STATE, 1)
//     await test(
//       read,
//       read.handleDataPacket,
//       PacketType.ST_STATE,
//       write.createPacket({ pType: PacketType.ST_DATA, payload: hexToBytes('0x1234') }),
//     )
//     assert.equal(read.state, ConnectionState.Connected, 'Socket state updated to CONNECTED')
//     await test(
//       read,
//       read.handleFinPacket,
//       PacketType.ST_STATE,
//       write.createPacket({ pType: PacketType.ST_FIN }),
//     )
//     assert.equal(read.state, ConnectionState.GotFin, 'Socket state updated to GOT_FIN')
//     await test(write, write.handleSynPacket, PacketType.ST_STATE)
//     assert.equal(
//       ConnectionState[write.state!],
//       ConnectionState[ConnectionState.Connected],
//       'Socket state set to CONNECTED',
//     )
//     write.finNr = 3
//     await write.handleStatePacket(3, 1000)
//     assert.equal(write.state, ConnectionState.Closed, 'Socket state updated to CLOSED')
//   })
// })

describe('uTP Socket Tests', async () => {
  const s = await _write(NetworkId.HistoryNetwork)
  s.logger = debug('test')
  s.content = Uint8Array.from([111, 222])
  s.setWriter(s.getSeqNr())
  it('socket.compare()', () => {
    s.ackNrs = [0, 1, 2, 3, 4, 5]
    s.writer!.dataChunks = [
      [0, Uint8Array.from([111])],
      [1, Uint8Array.from([222])],
      [2, Uint8Array.from([333])],
      [3, Uint8Array.from([444])],
      [4, Uint8Array.from([555])],
      [5, Uint8Array.from([666])],
    ]
    assert.ok(s.compare(), 'socket.compare() returns true for matching ackNrs and dataNrs')
    s.writer!.dataChunks = [
      [0, Uint8Array.from([111])],
      [1, Uint8Array.from([222])],
      [2, Uint8Array.from([333])],
      [3, Uint8Array.from([444])],
      [4, Uint8Array.from([555])],
      [5, Uint8Array.from([666])],
      [6, Uint8Array.from([777])],
    ]
    assert.notOk(s.compare(), 'socket.compare() returns false for mismatched ackNrs and dataNrs')
    s.ackNrs = [0, 1, 2, 3, 4, 6, 5]
    assert.ok(
      s.compare(),
      'socket.compare() returns true for matching but out of order ackNrs and dataNrs',
    )
  })
  it('socket.updateRtt()', () => {
    const delay = 100
    s.packetManager.congestionControl.outBuffer.set(1, 1000)
    s.packetManager.congestionControl.outBuffer.set(2, 2000)
    s.packetManager.congestionControl.outBuffer.set(3, 3000)
    s.packetManager.congestionControl.outBuffer.set(4, 4000)
    s.packetManager.congestionControl.outBuffer.set(5, 5000)
    s.packetManager.congestionControl.rtt = delay
    s.packetManager.congestionControl.rtt_var = 0
    s.packetManager.congestionControl.updateRTT(1100, 1)
    assert.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay,
      'socket.rtt should not change if packet rtt_var remains 0.',
    )
    s.packetManager.congestionControl.updateRTT(2092, 2)
    assert.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay - 1,
      'should correctly update RTT with from packet rtt value',
    )
    s.packetManager.congestionControl.updateRTT(3108, 3)
    assert.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay,
      'should correctly update RTT with from packet rtt value',
    )
    s.packetManager.congestionControl.updateRTT(4108, 4)
    assert.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay + 1,
      'should correctly update RTT with from packet rtt value',
    )
    s.packetManager.congestionControl.updateRTT(5093, 5)
    assert.deepEqual(
      s.packetManager.congestionControl.rtt,
      delay,
      'should correctly update RTT with from packet rtt value',
    )
  })
})
describe('seqNr overflow', () => {
  it('should reset seqNr to 0', async () => {
    const s = await _write(NetworkId.HistoryNetwork, 65535)
    s.logger = debug('test')
    s.content = new Uint8Array(1024)
    s.setWriter(s.getSeqNr())
    await s.writer?.write()
    await s.writer?.write()
    assert.equal(s.getSeqNr(), 1, 'seqNr should be reset to 0')
  })
})
