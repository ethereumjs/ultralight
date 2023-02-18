import { ContainerType, fromHexString, toHexString, UintBigintType } from '@chainsafe/ssz'
import tape from 'tape'
import { randomBytes } from 'crypto'
import {
  getContentId,
  getContentKey,
  ContentKeyType,
  HistoryProtocol,
  Receipt,
  TxReceiptType,
} from '../../../src/subprotocols/history/index.js'
import {
  BlockHeaderWithProof,
  EpochAccumulator,
  HistoricalEpochsType,
  ContentType,
} from '../../../src/subprotocols/history/types.js'
import { bufArrToArr } from '@ethereumjs/util'
import testData from './testData/headerWithProof.json' assert { type: 'json' }
import { historicalEpochs } from '../../../src/subprotocols/history/data/epochHashes.js'
import { BlockHeader } from '@ethereumjs/block'
import { readFileSync } from 'fs'
import { PortalNetwork, ProtocolId } from '../../../src/index.js'
import { ProofType } from '@chainsafe/persistent-merkle-tree'
tape('History Subprotocol contentKey serialization/deserialization', (t) => {
  t.test('content Key', (st) => {
    let blockHash = '0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d'
    let encodedKey = ContentKeyType.serialize(
      Buffer.concat([
        Uint8Array.from([ContentType.BlockHeader]),
        fromHexString(blockHash),
      ])
    )
    let contentId = getContentId(ContentType.BlockHeader, blockHash)
    st.equals(
      toHexString(encodedKey),
      '0x00d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d',
      'blockheader content key equals expected output'
    )
    st.equals(
      contentId,
      '0x3e86b3767b57402ea72e369ae0496ce47cc15be685bec3b4726b9f316e3895fe',
      'block header content ID matches'
    )
    blockHash = '0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d'
    encodedKey = ContentKeyType.serialize(
      Buffer.concat([
        Uint8Array.from([ContentType.BlockBody]),
        fromHexString(blockHash),
      ])
    )
    contentId = getContentId(ContentType.BlockBody, blockHash)
    st.equals(
      toHexString(encodedKey),
      '0x01d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d',
      'blockbody content key equals expected output'
    )
    st.equals(
      contentId,
      '0xebe414854629d60c58ddd5bf60fd72e41760a5f7a463fdcb169f13ee4a26786b',
      'block body content ID matches'
    )
    blockHash = '0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d'
    encodedKey = ContentKeyType.serialize(
      Buffer.concat([
        Uint8Array.from([ContentType.Receipt]),
        fromHexString(blockHash),
      ])
    )
    contentId = getContentId(ContentType.Receipt, blockHash)
    st.equals(
      toHexString(encodedKey),
      '0x02d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d',
      'receipt content key equals expected output'
    )
    st.equals(
      contentId,
      '0xa888f4aafe9109d495ac4d4774a6277c1ada42035e3da5e10a04cc93247c04a4',
      'receipt content ID matches'
    )
    st.end()
  })
  t.test('Receipt encoding decoding', (st) => {
    const testReceiptData = [
      {
        status: 1 as 0 | 1,
        cumulativeBlockGasUsed: BigInt(100),
        bitvector: Buffer.alloc(256),
        logs: [[Buffer.alloc(20), [Buffer.alloc(32), Buffer.alloc(32, 1)], Buffer.alloc(10)]],
        txType: 2,
      },
      {
        status: 0 as 0 | 1,
        cumulativeBlockGasUsed: BigInt(1000),
        bitvector: Buffer.alloc(256, 1),
        logs: [[Buffer.alloc(20, 1), [Buffer.alloc(32, 1), Buffer.alloc(32, 1)], Buffer.alloc(10)]],
        txType: 0,
      },
      {
        status: 1 as 0 | 1,
        cumulativeBlockGasUsed: BigInt(100),
        bitvector: Buffer.alloc(256),
        logs: [[Buffer.alloc(20), [Buffer.alloc(32), Buffer.alloc(32, 1)], Buffer.alloc(10)]],
      },
      {
        status: 0 as 0 | 1,
        cumulativeBlockGasUsed: BigInt(1000),
        bitvector: Buffer.alloc(256, 1),
        logs: [[Buffer.alloc(20, 1), [Buffer.alloc(32, 1), Buffer.alloc(32, 1)], Buffer.alloc(10)]],
      },
      {
        stateRoot: randomBytes(32),
        cumulativeBlockGasUsed: BigInt(100),
        bitvector: Buffer.alloc(256),
        logs: [[Buffer.alloc(20), [Buffer.alloc(32), Buffer.alloc(32, 1)], Buffer.alloc(10)]],
      },
      {
        stateRoot: randomBytes(32),
        cumulativeBlockGasUsed: BigInt(1000),
        bitvector: Buffer.alloc(256, 1),
        logs: [[Buffer.alloc(20, 1), [Buffer.alloc(32, 1), Buffer.alloc(32, 1)], Buffer.alloc(10)]],
      },
    ]
    const serializedReceipts = [
      Buffer.from(
        '02f9016d0164b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f866f864940000000000000000000000000000000000000000f842a00000000000000000000000000000000000000000000000000000000000000000a001010101010101010101010101010101010101010101010101010101010101018a00000000000000000000',
        'hex'
      ),
      Buffer.from(
        'f9016f008203e8b9010001010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101f866f864940101010101010101010101010101010101010101f842a00101010101010101010101010101010101010101010101010101010101010101a001010101010101010101010101010101010101010101010101010101010101018a00000000000000000000',
        'hex'
      ),
    ]
    const receipts = testReceiptData.map((r: any) => {
      return new Receipt(r)
    })
    const deserialized = Receipt.fromEncodedReceipt(serializedReceipts[0])
    st.deepEqual(
      receipts[0].encoded(),
      Receipt.fromReceiptData(testReceiptData[0] as TxReceiptType).encoded()
    )
    st.deepEqual(receipts[0].encoded(), serializedReceipts[0], 'Receipt decode test passed 1')
    st.deepEqual(deserialized.encoded(), receipts[0].encoded(), 'Receipt decode test passed 2')

    const _deserialized = Receipt.fromEncodedReceipt(serializedReceipts[1])
    st.deepEqual(receipts[1].encoded(), serializedReceipts[1], 'Receipt decode test passed 3')
    st.deepEqual(_deserialized.encoded(), receipts[1].encoded(), 'Receipt decode test passed 4')

    st.deepEqual(receipts[2].decoded(), testReceiptData[2], 'Receipt decode test passed 5')
    st.deepEqual(receipts[3].decoded(), testReceiptData[3], 'Receipt decode test passed 6')
    st.deepEqual(receipts[4].decoded(), testReceiptData[4], 'Receipt decode test passed 7')
    st.deepEqual(receipts[5].decoded(), testReceiptData[5], 'Receipt decode test passed 8')

    st.deepEqual(
      Receipt.decodeReceiptBuffer(serializedReceipts[0]).logs,
      bufArrToArr(testReceiptData[0].logs),
      'Decoded lgos from buffer'
    )
    st.deepEqual(
      Receipt.decodeReceiptBuffer(serializedReceipts[0]).bitvector,
      bufArrToArr(testReceiptData[0].bitvector),
      'Decoded bitvector from buffer'
    )
    st.deepEqual(
      Receipt.decodeReceiptBuffer(serializedReceipts[1]).logs,
      bufArrToArr(testReceiptData[1].logs),
      'Decoded lgos from buffer'
    )
    st.deepEqual(
      Receipt.decodeReceiptBuffer(serializedReceipts[1]).bitvector,
      bufArrToArr(testReceiptData[1].bitvector),
      'Decoded bitvector from buffer'
    )

    st.end()
  })
  t.end()
})

tape('Header With Proof serialization/deserialization tests', async (t) => {
  const masterAccumulator = readFileSync('./src/subprotocols/history/data/merge_macc.bin', {
    encoding: 'hex',
  })
  const _historicalEpochs = HistoricalEpochsType.deserialize(
    fromHexString(masterAccumulator).slice(4)
  )
  const MasterAccumulatorType = new ContainerType({
    historicalEpochs: HistoricalEpochsType,
  })
  const serialized_container = MasterAccumulatorType.serialize({
    historicalEpochs: _historicalEpochs,
  })
  t.deepEqual(
    fromHexString(masterAccumulator),
    serialized_container,
    'Serialized Container matches MasterAccumulator'
  )
  console.log({
    mast_accumulator: '0x' + masterAccumulator.slice(0, 32) + '...',
    serial_container: toHexString(serialized_container).slice(0, 34) + '...',
  })

  const actualEpoch = readFileSync(
    './test/subprotocols/history/testData/0x03cddbda3fd6f764602c06803ff083dbfc73f2bb396df17a31e5457329b9a0f38d.portalcontent',
    { encoding: 'hex' }
  )
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })
  const history = new HistoryProtocol(node)
  const serializedBlock1 = fromHexString(testData[1000001].content_value)
  const serializedBlock2 = fromHexString(testData[1000002].content_value)
  const headerWithProof = BlockHeaderWithProof.deserialize(serializedBlock1)
  const headerWithProof2 = BlockHeaderWithProof.deserialize(serializedBlock2)
  const deserializedHeader = BlockHeader.fromRLPSerializedHeader(
    Buffer.from(headerWithProof.header),
    {
      skipConsensusFormatValidation: true,
      hardforkByBlockNumber: true,
    }
  )
  const deserializedHeader2 = BlockHeader.fromRLPSerializedHeader(
    Buffer.from(headerWithProof2.header),
    {
      skipConsensusFormatValidation: true,
      hardforkByBlockNumber: true,
    }
  )
  const contentKey = getContentKey(
    ContentType.BlockHeader,
    deserializedHeader.hash()
  )
  const epochHash = historicalEpochs[Math.floor(1000001 / 8192)]
  const actual_Epoch = EpochAccumulator.deserialize(fromHexString(actualEpoch))
  const tree = EpochAccumulator.value_toTree(actual_Epoch)
  const proof = EpochAccumulator.createFromProof(
    {
      type: ProofType.single,
      gindex: EpochAccumulator.tree_getLeafGindices(1n, tree)[(1000001 % 8192) * 2],
      witnesses: headerWithProof.proof.value!,
      leaf: deserializedHeader.hash(),
    },
    fromHexString(epochHash)
  )
  t.ok(proof, `proof is valid: ${toHexString(proof.hashTreeRoot())}`)
  t.equal(
    toHexString(EpochAccumulator.hashTreeRoot(actual_Epoch)),
    epochHash,
    'stored epoch hash matches valid epoch'
  )
  const total_difficulty = new UintBigintType(32).deserialize(headerWithProof.proof.value![0])
  const total_difficulty2 = new UintBigintType(32).deserialize(headerWithProof2.proof.value![0])
  t.equal(
    total_difficulty2 - total_difficulty,
    deserializedHeader2.difficulty,
    'deserialized headers have valid difficulty'
  )
  t.equal(deserializedHeader.number, 1000001n, 'deserialized header number matches test vector')
  t.equal(contentKey, testData[1000001].content_key, 'generated expected content key')
  t.ok(history.validateHeader(serializedBlock1, toHexString(deserializedHeader.hash())))
  t.end()
})
