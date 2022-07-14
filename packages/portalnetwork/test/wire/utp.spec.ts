import { toHexString } from '@chainsafe/ssz'
import { randomBytes } from 'crypto'
import tape from 'tape'
import {
  Packet,
  PacketHeader,
  PacketType,
  SelectiveAckHeader,
  bufferToPacket,
  attatchPrefix,
  encodeWithVariantPrefix,
  dropPrefixes,
  parsePrefix,
} from '../../src/wire/utp/index.js'

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
  t.test('VarInt Prefix encoding test', (st) => {
    const contents: Uint8Array[] = []
    const lengths = []
    let totalLength = 0
    for (let i = 0; i < 10; i++) {
      const length = 1000 + Math.ceil(Math.random() * 10000)
      const content = Uint8Array.from(randomBytes(length))
      lengths.push(length)
      totalLength += length
      contents.push(content)
    }
    const encoded = encodeWithVariantPrefix(contents)
    st.ok(
      encoded.length > totalLength,
      `Length should be greater with prefixes...${encoded.length} > ${totalLength}`
    )
    const c = contents[0]
    const ci = attatchPrefix(c)
    st.ok(ci.length > c.length, `prefix adds length to content, ${ci.length} > ${c.length}`)

    const cii = parsePrefix(ci)
    st.equal(cii[0], c.length, `Length parsed by parsePrefix, ${cii[0]} = ${c.length}`)
    st.equal(cii[1], ci.length - c.length, `Offset calculated correctly, ${cii[1]}`)
    const decoded = dropPrefixes(encoded)
    st.ok(decoded.length > 0, `Decoded returns non-empty array, length = ${decoded.length}`)
    st.deepEqual(
      contents.length,
      decoded.length,
      `decoded array is same length as original, ${contents.length} = ${decoded.length}`
    )
    st.deepEqual(
      contents[0],
      decoded[0],
      `first item matches, "${toHexString(contents[0]).slice(0, 5)}..." === "${toHexString(
        decoded[0]
      ).slice(0, 5)}..."`
    )
    st.deepEqual(contents, decoded, `Whole content array successfully encoded/decoded`)

    st.end()
  })
})
