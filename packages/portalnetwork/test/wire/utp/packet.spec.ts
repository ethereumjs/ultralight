import { fromHexString, toHexString } from '@chainsafe/ssz'
import tape from 'tape'
import {
  Packet,
  PacketHeader,
  PacketType,
  SelectiveAckHeader,
} from '../../../src/wire/utp/index.js'
import { createDataOpts, createPacketOpts } from '../../../src/wire/utp/Packets/create.js'

const DEFAULT_TIMESTAMP = 3384187322
const DEFAULT_RAND_ID = 1234
const DEFAULT_RAND_SEQNR = 5555
const DEFAULT_RAND_ACKNR = 4444
const DEFAULT_RTT_VAR = 20

export const dataPacketTestPayload = fromHexString(
  '0x010004d20e710cbf00000064000001f4007b15b3c190c9463327a10f8c5a48a02f956738979f317668d58cd0bd57c29aa4b60717f476a7ec41d650d04f62d38504ad29f27392b2b8b0f075a391234132e2bd4932c151b6cad2c5e3300e36149d1ba7d6511b9b6aa8a6e37ba1f8e9474fa5f772c4d43d62fd2a277dc3bd70a55337c96a988aa3ea2dcd9bd834ced9dc20814d454e6349eb5f82a5f481a06b27d77f2b02a3795f86fc264b17cc41b7d3ad20a401324909d2e896ddb3e79fe7ed87904564968196ae7becc332e6456cbaa1892e06cacf667f2d94787361de936157e4dd648895e990cec3e57a76c44fe4d41ad247f1dfcce7d242fa7d3575ce40b886e49096c0ed7738966500e23048297d2a9a7dbd17947824a4f5d73ff3a1dd20e7f7f4ff5a3787934ab4e8d8ded5a84113c9160be4d6b7908b40ccd9facf1631950db591e35b50fe285cfe5df141b6c7f5e65a0e434c3dd0d1a070c6f29ef7236770f218b70ceacc79cd0cb2826e0df8262eeb03c4a566221e776ea080ac7972ab71fdd8a3247c00d8fd198fe42673a974cdebb66d5ba77d99347866027b1770560619e3ebb9ad36f62e105a2cee87f276171a2b248df21d66b23dd19b745eecd59626eb98b9b357be872eb480711623fa702483cc2791a60280c5fc9f8ec6a6d0e75935d87512daa68fd9ab4340fddf027365c938336769339a8f8449d70c2cf7c55444f5e0c355'
)

export type testParams = {
  type: PacketType
  data: createPacketOpts
  selective?: boolean
}

export const packetTestData: Record<string, testParams> = {
  syn: {
    type: PacketType.ST_SYN,
    data: {
      sndConnectionId: DEFAULT_RAND_ID,
      seqNr: 1,
      ackNr: DEFAULT_RAND_ACKNR,
      timestamp: DEFAULT_TIMESTAMP,
    },
  },
  ack: {
    type: PacketType.ST_STATE,
    data: {
      sndConnectionId: DEFAULT_RAND_SEQNR,
      seqNr: DEFAULT_RAND_SEQNR,
      ackNr: DEFAULT_RAND_ACKNR,
      rtt_var: DEFAULT_RTT_VAR,
      timestamp: DEFAULT_TIMESTAMP,
    },
  },
  selectiveAck: {
    type: PacketType.ST_STATE,
    selective: true,
    data: {
      sndConnectionId: DEFAULT_RAND_SEQNR,
      seqNr: DEFAULT_RAND_SEQNR,
      ackNr: DEFAULT_RAND_ACKNR,
      rtt_var: DEFAULT_RTT_VAR,
      ackNrs: [5550, 5551, 5552, 5553, 5554],
      timestamp: DEFAULT_TIMESTAMP,
    },
  },
  data: {
    type: PacketType.ST_DATA,
    data: {
      sndConnectionId: DEFAULT_RAND_SEQNR,
      seqNr: DEFAULT_RAND_SEQNR,
      ackNr: DEFAULT_RAND_ACKNR,
      rtt_var: DEFAULT_RTT_VAR,
      timestamp: DEFAULT_TIMESTAMP,
      payload: dataPacketTestPayload,
    },
  },
  fin: {
    type: PacketType.ST_FIN,
    data: {
      sndConnectionId: DEFAULT_RAND_ID,
      seqNr: DEFAULT_RAND_SEQNR,
      ackNr: DEFAULT_RAND_ACKNR,
      timestamp: DEFAULT_TIMESTAMP,
    },
  },
  reset: {
    type: PacketType.ST_RESET,
    data: {
      sndConnectionId: DEFAULT_RAND_ID,
      seqNr: DEFAULT_RAND_SEQNR,
      ackNr: DEFAULT_RAND_ACKNR,
      timestamp: DEFAULT_TIMESTAMP,
    },
  },
}

// 1. Create Packet with test data
// 2. Encode Packet with packet type encoder
// 3. Decode Packet with bufferToPacket()
// 4. Compare test-data / created packet / decoded packet

export function encodingTest(
  t: tape.Test,
  packetType: PacketType,
  testData: createPacketOpts,
  selective?: boolean
) {
  t.test(`${PacketType[packetType]} packet encoding test.`, (st) => {
    const testPacket: Packet = selective
      ? Packet.create(packetType, testData, selective)
      : Packet.create(packetType, testData)
    const encodedPacket = testPacket.encode()
    const testHeader = testPacket.header
    const decodedPacket = Packet.bufferToPacket(encodedPacket)
    const decodedHeader: PacketHeader | SelectiveAckHeader = decodedPacket.header
    st.equal(
      Object.entries(decodedHeader).toString(),
      Object.entries(testHeader).toString(),
      `Successfully encoded and decoded ${PacketType[packetType]} packet`
    )
    if (selective) {
      st.deepEqual(
        Uint8Array.from((decodedHeader as SelectiveAckHeader).selectiveAckExtension.bitmask),
        Uint8Array.from((testHeader as SelectiveAckHeader).selectiveAckExtension.bitmask),
        `sucessfully encoded and decoded Selecive Ack Bitmask`
      )
    }
    if (packetType === PacketType.ST_DATA) {
      st.equal(
        toHexString(Buffer.from((testData as createDataOpts).payload)),
        toHexString(Buffer.from(Uint8Array.from(decodedPacket.payload))),
        `Successfully encoded and decoded DATA Packet payload.`
      )
    }
    st.end()
  })
}

tape('uTP packet tests', (t) => {
  t.throws(() => {
    Packet.create(9, {
      sndConnectionId: 1,
      seqNr: 1,
      ackNr: 1,
    })
  }, 'Packet.create should throw on invalid Packet Type')
  Object.values(packetTestData).map((packetData) => {
    encodingTest(t, packetData.type, packetData.data, packetData.selective)
  })
})
