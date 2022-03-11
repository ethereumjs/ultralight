import { toHexString } from '@chainsafe/ssz'
import tape from 'tape'
import {
  Packet,
  PacketHeader,
  PacketType,
  SelectiveAckHeader,
  bufferToPacket,
} from '../../src/wire/utp'

tape('uTP encoding tests', (t) => {
  t.test('SYN packet encoding test', (st) => {
    const synPacketHeader = new PacketHeader({
      pType: PacketType.ST_SYN,
      version: 1,
      extension: 0,
      connectionId: 10049,
      timestamp: 3384187322,
      timestampDiff: 0,
      wndSize: 1048576,
      seqNr: 11884,
      ackNr: 0,
    })
    const synPacket = new Packet({ header: synPacketHeader, payload: Uint8Array.from([]) })
    const encodedPacket = synPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    st.equal(
      Object.entries(synPacketHeader).toString(),
      Object.entries(decodedPacket.header).toString(),
      'sucessfully decoded SYN packet header'
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x41002741c9b699ba00000000001000002e6c0000',
      'successfully encoded SYN packet'
    )
    st.end()
  })
  t.test('ACK packet encoding test', (st) => {
    const ackPacketHeader = new PacketHeader({
      pType: PacketType.ST_STATE,
      version: 1,
      extension: 0,
      connectionId: 10049,
      timestamp: 6195294,
      timestampDiff: 916973699,
      wndSize: 1048576,
      seqNr: 16807,
      ackNr: 11885,
    })
    const ackPacket = new Packet({ header: ackPacketHeader, payload: Uint8Array.from([]) })
    const encodedPacket = ackPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    st.equal(
      Object.entries(ackPacketHeader).toString(),
      Object.entries(decodedPacket.header).toString(),
      'sucessfully decoded SYN packet header'
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x21002741005e885e36a7e8830010000041a72e6d',
      'successfully encoded ACK packet'
    )
    st.end()
  })
  t.test('ACK packet with selective ACK encoding test', (st) => {
    const selectiveAckPacketHeader = new SelectiveAckHeader(
      {
        pType: PacketType.ST_STATE,
        version: 1,
        extension: 1,
        connectionId: 10049,
        timestamp: 6195294,
        timestampDiff: 916973699,
        wndSize: 1048576,
        seqNr: 16807,
        ackNr: 11885,
      },
      Uint8Array.from([1, 0, 0, 128])
    )
    const selectiveAckPacket = new Packet({
      header: selectiveAckPacketHeader,
      payload: Uint8Array.from([]),
    })
    const encodedPacket = selectiveAckPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    const decodedPacketHeader = decodedPacket.header as SelectiveAckHeader
    st.equal(
      Object.entries(decodedPacket.header).toString(),
      Object.entries(selectiveAckPacket.header).toString(),
      'sucessfully decoded Selective-ACK packet header'
    )
    st.equal(
      Uint8Array.from(decodedPacketHeader.selectiveAckExtension.bitmask).toString(),
      Uint8Array.from([1, 0, 0, 128]).toString(),
      `sucessfully decoded Selecive Ack Bitmask ${Uint8Array.from([1, 0, 0, 128])}`
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x21012741005e885e36a7e8830010000041a72e6d000401000080',
      'successfully encoded selective ACK packet'
    )
    st.end()
  })

  t.test('DATA packet encoding test', (st) => {
    const dataPacketHeader = new PacketHeader({
      pType: PacketType.ST_DATA,
      version: 1,
      extension: 0,
      connectionId: 26237,
      timestamp: 252492495,
      timestampDiff: 242289855,
      wndSize: 1048576,
      seqNr: 8334,
      ackNr: 16806,
    })
    const dataPacket = new Packet({
      header: dataPacketHeader,
      payload: Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    })
    const encodedPacket = dataPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    const decodedPacketHeader = decodedPacket.header as PacketHeader
    st.equal(
      Object.entries(decodedPacketHeader).toString(),
      Object.entries(dataPacketHeader).toString(),
      'sucessfully decoded DATA packet header'
    )
    st.equal(
      Uint8Array.from(decodedPacket.payload).toString(),
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).toString(),
      `successfully decoded DATA packet payload`
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x0100667d0f0cbacf0e710cbf00100000208e41a600010203040506070809',
      'successfully encoded DATA packet'
    )
    st.end()
  })
  t.test('FIN packet encoding test', (st) => {
    const finPacketHeader = new PacketHeader({
      pType: PacketType.ST_FIN,
      version: 1,
      extension: 0,
      connectionId: 19003,
      timestamp: 515227279,
      timestampDiff: 511481041,
      wndSize: 1048576,
      seqNr: 41050,
      ackNr: 16806,
    })
    const finPacket = new Packet({ header: finPacketHeader, payload: Uint8Array.from([]) })
    const encodedPacket = finPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    st.equal(
      Object.entries(finPacketHeader).toString(),
      Object.entries(decodedPacket.header).toString(),
      'sucessfully decoded FIN packet header'
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x11004a3b1eb5be8f1e7c94d100100000a05a41a6',
      'successfully encoded FIN packet'
    )
    st.end()
  })
  t.test('RESET packet encoding test', (st) => {
    const resetPacketHeader = new PacketHeader({
      pType: PacketType.ST_RESET,
      version: 1,
      extension: 0,
      connectionId: 62285,
      timestamp: 751226811,
      timestampDiff: 0,
      wndSize: 0,
      seqNr: 55413,
      ackNr: 16807,
    })
    const resetPacket = new Packet({ header: resetPacketHeader, payload: Uint8Array.from([]) })
    const encodedPacket = resetPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    st.equal(
      Object.entries(resetPacketHeader).toString(),
      Object.entries(decodedPacket.header).toString(),
      'sucessfully decoded RESET packet header'
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x3100f34d2cc6cfbb0000000000000000d87541a7',
      'successfully encoded RESET packet'
    )
    st.end()
  })
})

// tape('uTP packet handling', async (t) => {
//   // Start the proxy and a CLI (or browser) node.  Copy ENR and NodeId from CLI node and paste in here.  Then run test.
//   const cli_enr =
//     'enr:-IS4QLjuQ4EC8GRSa2EEVnL2Uf1C55rHQIgF-YXyx_dU9r_tYr3TvQhH4FZ2YmPzxeqqhgkhqd9aswCmbQjgcjeEL98FgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQILMMDMddILLqfkMkjaT5MuthwaiKFuasOmxaBrUP3RYYN1ZHCCl30'
//   const cli_nodeId = '6a576d481b39141aa4bcd77c9f30cef7beceed49453c9fd629ff73ca6724816a'

//   const contentKey = '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'

//   const id = await PeerId.create({ keyType: 'secp256k1' })
//   const enr = ENR.createFromPeerId(id)
//   enr.setLocationMultiaddr(new Multiaddr('/ip4/127.0.0.1/udp/0'))
//   const portal = new PortalNetwork(
//     {
//       enr: enr,
//       peerId: id,
//       multiaddr: new Multiaddr('/ip4/127.0.0.1/udp/0'),
//       transport: 'wss',
//       proxyAddress: `ws://127.0.0.1:5050`,
//     },
//     1n
//   )
//   await portal.start()
//   portal.client.addEnr(cli_enr)
//   // const syn = await portal.uTP.initiateConnectionRequest(cli_nodeId, 5555)
//   t.test('Portal Client Test', async (st) => {
//     st.ok(portal.client.isStarted(), 'Portal Client Started')
//     const pong = await portal.sendPing(cli_nodeId, SubNetworkIds.HistoryNetwork)
//     st.ok(pong, 'Ping/Pong 1 successful')
//     const res = await portal.historyNetworkContentLookup(0, contentKey)
//     st.ok(
//       toHexString(res as Uint8Array) ===
//         '0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4',
//       'find content successful'
//     )
//   })
// })
