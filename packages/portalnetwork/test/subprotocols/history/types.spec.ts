import { fromHexString, toHexString } from '@chainsafe/ssz'
import tape from 'tape'
import { randomBytes } from 'crypto'
import {
  getHistoryNetworkContentId,
  HistoryNetworkContentKeyUnionType,
  Receipt,
  TxReceiptType,
} from '../../../src/subprotocols/history/index.js'
import { HistoryNetworkContentTypes } from '../../../src/subprotocols/history/types.js'
import { bufArrToArr } from '@ethereumjs/util'

tape('History Subprotocol contentKey serialization/deserialization', (t) => {
  t.test('content Key', (st) => {
    let chainId = 15
    let blockHash = '0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d'
    let encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: HistoryNetworkContentTypes.BlockHeader,
      value: { chainId: chainId, blockHash: fromHexString(blockHash) },
    })
    let contentId = getHistoryNetworkContentId(
      chainId,
      HistoryNetworkContentTypes.BlockHeader,
      blockHash
    )
    st.equals(
      toHexString(encodedKey),
      '0x000f00d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d',
      'blockheader content key equals expected output'
    )
    st.equals(
      contentId,
      '0x2137f185b713a60dd1190e650d01227b4f94ecddc9c95478e2c591c40557da99',
      'block header content ID matches'
    )
    chainId = 20
    blockHash = '0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d'
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: HistoryNetworkContentTypes.BlockBody,
      value: { chainId, blockHash: fromHexString(blockHash) },
    })
    contentId = getHistoryNetworkContentId(chainId, HistoryNetworkContentTypes.BlockBody, blockHash)
    st.equals(
      toHexString(encodedKey),
      '0x011400d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d',
      'blockbody content key equals expected output'
    )
    st.equals(
      contentId,
      '0x1c6046475f0772132774ab549173ca8487bea031ce539cad8e990c08df5802ca',
      'block body content ID matches'
    )
    chainId = 4
    blockHash = '0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d'
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: HistoryNetworkContentTypes.Receipt,
      value: { chainId, blockHash: fromHexString(blockHash) },
    })
    contentId = getHistoryNetworkContentId(chainId, HistoryNetworkContentTypes.Receipt, blockHash)
    st.equals(
      toHexString(encodedKey),
      '0x020400d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d',
      'receipt content key equals expected output'
    )
    st.equals(
      contentId,
      '0xaa39e1423e92f5a667ace5b79c2c98adbfd79c055d891d0b9c49c40f816563b2',
      'receipt content ID matches'
    )
    chainId = 1
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: HistoryNetworkContentTypes.HeaderAccumulator,
      value: { selector: 0, value: null },
    })
    contentId = getHistoryNetworkContentId(chainId, HistoryNetworkContentTypes.HeaderAccumulator)
    st.equals(contentId, '0xc0ba8a33ac67f44abff5984dfbb6f56c46b880ac2b86e1f23e7fa9c402c53ae7')
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
