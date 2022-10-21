import { fromHexString, toHexString } from '@chainsafe/ssz'
import tape from 'tape'
import { randomBytes } from 'crypto'
import {
  getHistoryNetworkContentId,
  HistoryNetworkContentKeyType,
  Receipt,
  TxReceiptType,
} from '../../../src/subprotocols/history/index.js'
import { HistoryNetworkContentTypes } from '../../../src/subprotocols/history/types.js'
import { bufArrToArr } from '@ethereumjs/util'

tape('History Subprotocol contentKey serialization/deserialization', (t) => {
  t.test('content Key', (st) => {
    let blockHash = '0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d'
    let encodedKey = HistoryNetworkContentKeyType.serialize(
      Buffer.concat([
        Uint8Array.from([HistoryNetworkContentTypes.BlockHeader]),
        fromHexString(blockHash),
      ])
    )
    let contentId = getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockHeader, blockHash)
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
    encodedKey = HistoryNetworkContentKeyType.serialize(
      Buffer.concat([
        Uint8Array.from([HistoryNetworkContentTypes.BlockBody]),
        fromHexString(blockHash),
      ])
    )
    contentId = getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockBody, blockHash)
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
    encodedKey = HistoryNetworkContentKeyType.serialize(
      Buffer.concat([
        Uint8Array.from([HistoryNetworkContentTypes.Receipt]),
        fromHexString(blockHash),
      ])
    )
    contentId = getHistoryNetworkContentId(HistoryNetworkContentTypes.Receipt, blockHash)
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
