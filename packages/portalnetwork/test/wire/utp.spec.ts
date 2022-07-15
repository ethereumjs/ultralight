import { fromHexString, toHexString } from '@chainsafe/ssz'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { randomBytes } from 'crypto'
import debug from 'debug'
import tape from 'tape'
import {
  attatchPrefix,
  encodeWithVariantPrefix,
  dropPrefixes,
  parsePrefix,
  bufferToPacket,
  createAckPacket,
  createDataPacket,
  createFinPacket,
  createResetPacket,
  createSelectiveAckPacket,
  createSynPacket,
  DEFAULT_WINDOW_SIZE,
  PacketHeader,
  SelectiveAckHeader,
  BasicUtp,
  BUFFER_SIZE,
} from '../../src/wire/utp/index.js'
import {
  PortalNetworkUTP,
  RequestCode,
} from '../../src/wire/utp/PortalNetworkUtp/PortalNetworkUTP.js'
tape('uTP packet tests', (t) => {
  t.test('SYN packet encoding test', (st) => {
    const synPacket = createSynPacket(1234, 1, 5555, 3384187322)
    const encodedPacket = synPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    st.equal(
      Object.entries(synPacket.header).toString(),
      Object.entries(decodedPacket.header).toString(),
      'sucessfully decoded SYN packet header'
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x410004d2c9b699ba00000000000004b0000115b3',
      'successfully encoded SYN packet'
    )
    st.end()
  })
  t.test('ACK packet encoding test', (st) => {
    const ackPacket = createAckPacket(1, 1234, 5555, 100, DEFAULT_WINDOW_SIZE, 916973699)
    const encodedPacket = ackPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    st.equal(
      Object.entries(ackPacket.header).toString(),
      Object.entries(decodedPacket.header).toString(),
      'sucessfully decoded SYN packet header'
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x210004d236a7e88300000064000004b0000115b3',
      'successfully encoded ACK packet'
    )
    st.end()
  })
  t.test('ACK packet with selective ACK encoding test', (st) => {
    const selectiveAckPacket = createSelectiveAckPacket(
      123,
      1234,
      5555,
      100,
      DEFAULT_WINDOW_SIZE,
      [2, 3, 4, 5],
      916973699
    )
    const encodedPacket = selectiveAckPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    const packetHeader = selectiveAckPacket.header as SelectiveAckHeader
    const decodedPacketHeader = decodedPacket.header as SelectiveAckHeader
    st.equal(
      Object.entries(decodedPacket.header).toString(),
      Object.entries(selectiveAckPacket.header).toString(),
      'sucessfully decoded Selective-ACK packet header'
    )
    st.deepEqual(
      Uint8Array.from(decodedPacketHeader.selectiveAckExtension.bitmask),
      Uint8Array.from(packetHeader.selectiveAckExtension.bitmask),
      `sucessfully decoded Selecive Ack Bitmask`
    )
    st.equal(
      toHexString(encodedPacket),
      '0x210104d236a7e88300000064000004b0007b15b3000402030405',
      'successfully encoded selective ACK packet'
    )
    st.end()
  })

  t.test('DATA packet encoding test', (st) => {
    const payload = fromHexString(
      '0x010004d20e710cbf00000064000001f4007b15b3c190c9463327a10f8c5a48a02f956738979f317668d58cd0bd57c29aa4b60717f476a7ec41d650d04f62d38504ad29f27392b2b8b0f075a391234132e2bd4932c151b6cad2c5e3300e36149d1ba7d6511b9b6aa8a6e37ba1f8e9474fa5f772c4d43d62fd2a277dc3bd70a55337c96a988aa3ea2dcd9bd834ced9dc20814d454e6349eb5f82a5f481a06b27d77f2b02a3795f86fc264b17cc41b7d3ad20a401324909d2e896ddb3e79fe7ed87904564968196ae7becc332e6456cbaa1892e06cacf667f2d94787361de936157e4dd648895e990cec3e57a76c44fe4d41ad247f1dfcce7d242fa7d3575ce40b886e49096c0ed7738966500e23048297d2a9a7dbd17947824a4f5d73ff3a1dd20e7f7f4ff5a3787934ab4e8d8ded5a84113c9160be4d6b7908b40ccd9facf1631950db591e35b50fe285cfe5df141b6c7f5e65a0e434c3dd0d1a070c6f29ef7236770f218b70ceacc79cd0cb2826e0df8262eeb03c4a566221e776ea080ac7972ab71fdd8a3247c00d8fd198fe42673a974cdebb66d5ba77d99347866027b1770560619e3ebb9ad36f62e105a2cee87f276171a2b248df21d66b23dd19b745eecd59626eb98b9b357be872eb480711623fa702483cc2791a60280c5fc9f8ec6a6d0e75935d87512daa68fd9ab4340fddf027365c938336769339a8f8449d70c2cf7c55444f5e0c355'
    )
    const dataPacket = createDataPacket(123, 1234, 5555, 500, payload, 100, 242289855)
    const encodedPacket = dataPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    const decodedPacketHeader = decodedPacket.header as PacketHeader
    st.equal(
      Object.entries(decodedPacketHeader).toString(),
      Object.entries(dataPacket.header).toString(),
      'sucessfully decoded DATA packet header'
    )
    st.deepEqual(
      Uint8Array.from(decodedPacket.payload),
      dataPacket.payload,
      `successfully decoded DATA packet payload`
    )
    st.equal(
      toHexString(encodedPacket),
      '0x010004d20e710cbf00000064000001f4007b15b3010004d20e710cbf00000064000001f4007b15b3c190c9463327a10f8c5a48a02f956738979f317668d58cd0bd57c29aa4b60717f476a7ec41d650d04f62d38504ad29f27392b2b8b0f075a391234132e2bd4932c151b6cad2c5e3300e36149d1ba7d6511b9b6aa8a6e37ba1f8e9474fa5f772c4d43d62fd2a277dc3bd70a55337c96a988aa3ea2dcd9bd834ced9dc20814d454e6349eb5f82a5f481a06b27d77f2b02a3795f86fc264b17cc41b7d3ad20a401324909d2e896ddb3e79fe7ed87904564968196ae7becc332e6456cbaa1892e06cacf667f2d94787361de936157e4dd648895e990cec3e57a76c44fe4d41ad247f1dfcce7d242fa7d3575ce40b886e49096c0ed7738966500e23048297d2a9a7dbd17947824a4f5d73ff3a1dd20e7f7f4ff5a3787934ab4e8d8ded5a84113c9160be4d6b7908b40ccd9facf1631950db591e35b50fe285cfe5df141b6c7f5e65a0e434c3dd0d1a070c6f29ef7236770f218b70ceacc79cd0cb2826e0df8262eeb03c4a566221e776ea080ac7972ab71fdd8a3247c00d8fd198fe42673a974cdebb66d5ba77d99347866027b1770560619e3ebb9ad36f62e105a2cee87f276171a2b248df21d66b23dd19b745eecd59626eb98b9b357be872eb480711623fa702483cc2791a60280c5fc9f8ec6a6d0e75935d87512daa68fd9ab4340fddf027365c938336769339a8f8449d70c2cf7c55444f5e0c355',
      'successfully encoded DATA packet'
    )
    st.end()
  })
  t.test('FIN packet encoding test', (st) => {
    const finPacket = createFinPacket(1234, 123, 5555, DEFAULT_WINDOW_SIZE, 1048576)
    const encodedPacket = finPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    st.deepEqual(
      Object.entries(finPacket.header),
      Object.entries(decodedPacket.header),
      'sucessfully decoded FIN packet header'
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x110004d20010000000000000000004b0007b15b3',
      'successfully encoded FIN packet'
    )
    st.end()
  })
  t.test('RESET packet encoding test', (st) => {
    const resetPacket = createResetPacket(123, 1234, 5555, 751226811)
    const encodedPacket = resetPacket.encodePacket()
    const decodedPacket = bufferToPacket(encodedPacket)
    st.deepEqual(
      Object.entries(resetPacket.header),
      Object.entries(decodedPacket.header),
      'sucessfully decoded RESET packet header'
    )
    st.strictEquals(
      toHexString(encodedPacket),
      '0x310004d22cc6cfbb0000000000000000007b15b3',
      'successfully encoded RESET packet'
    )
    st.end()
  })
})

tape('uTP protocol tests', (t) => {
  const protocol = new BasicUtp()
  const logger = debug('uTP-')
  const uTP = new PortalNetworkUTP(logger)
  t.test('VarInt Prefix', (st) => {
    const contents: Uint8Array[] = []
    const lengths: number[] = []
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
  t.test('Content Write/Read', async (st) => {
    const sampleSize = 50000
    const peerId = await createSecp256k1PeerId()
    const _peerId = await createSecp256k1PeerId()
    const content = randomBytes(sampleSize)
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
    const reader = await socket.utp.createNewReader(_socket, 2)
    const chunks = writer.chunk()
    const compiled = await reader.compile(Object.values(chunks))
    st.equal(
      Object.keys(chunks).length,
      Math.ceil(sampleSize / BUFFER_SIZE),
      `Content Writer divided content correctly`
    )
    st.equal(compiled.length, content.length, `Compiled length matches content`)
    st.deepEqual(Buffer.from(compiled), content, `Content Reader correctly recompiled content`)
  })
})
