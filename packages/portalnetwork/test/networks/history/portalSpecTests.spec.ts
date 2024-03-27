import { BlockHeader } from '@ethereumjs/block'
import { TransactionFactory } from '@ethereumjs/tx'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import { resolve } from 'path'
import { assert, describe, it } from 'vitest'

import {
  BlockBodyContentType,
  BlockHeaderWithProof,
  EpochAccumulator,
  HistoryNetworkContentType,
  MasterAccumulatorType,
  Receipt,
  decodeHistoryNetworkContentKey,
  sszReceiptType,
  sszReceiptsListType,
} from '../../../src/index.js'

describe('Accumulator spec tests', () => {
  it('should deserialize the master accumulator', () => {
    const acc = readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/history/accumulator/finished_accumulator.ssz',
      ),
    )
    const masterAccumulator = MasterAccumulatorType.deserialize(acc)
    assert.equal(masterAccumulator.historicalEpochs.length, 1897)
  })
  it('should deserialize an epoch accumulator', () => {
    const acc = readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/history/accumulator/epoch-accumulator-00122.ssz',
      ),
    )
    const epochAccumulator = EpochAccumulator.deserialize(acc)
    assert.equal(epochAccumulator[0].totalDifficulty, 7128007083488816122n)
  })
})

describe('block body tests', () => {
  it('should deserialize block body keys and values', () => {
    const testVector: { content_key: string; content_value: string } = yaml.load(
      readFileSync(
        resolve(
          __dirname,
          '../../../../portal-spec-tests/tests/mainnet/history/bodies/14764013.yaml',
        ),
        {
          encoding: 'utf-8',
        },
      ),
    ) as any
    const key = decodeHistoryNetworkContentKey(testVector.content_key)
    assert.equal(key.contentType, 1)
    const body = BlockBodyContentType.deserialize(hexToBytes(testVector.content_value))
    const tx0Hash = bytesToHex(
      TransactionFactory.fromSerializedData(body.allTransactions[0]).hash(),
    )
    assert.equal(tx0Hash, '0x163dae461ab32787eaecdad0748c9cf5fe0a22b443bc694efae9b80e319d9559')
  })
})

describe('header tests', () => {
  it('should deserialize header with proof', () => {
    const testVector: { content_key: string; content_value: string } = yaml.load(
      readFileSync(
        resolve(
          __dirname,
          '../../../../portal-spec-tests/tests/mainnet/history/headers_with_proof/1000010.yaml',
        ),
        {
          encoding: 'utf-8',
        },
      ),
    ) as any
    const headerWithProof = BlockHeaderWithProof.deserialize(hexToBytes(testVector.content_value))
    const header = BlockHeader.fromRLPSerializedHeader(headerWithProof.header, {
      setHardfork: true,
    })
    assert.equal(header.number, 1000010n)
    assert.equal(
      bytesToHex(headerWithProof.proof.value![0]),
      '0xcead98e305c70563000000000000000000000000000000000000000000000000',
    )
  })
})

describe('receipt tests', () => {
  it('should deserialize receipts', () => {
    const testVector: { content_key: string; content_value: string } = yaml.load(
      readFileSync(
        resolve(
          __dirname,
          '../../../../portal-spec-tests/tests/mainnet/history/receipts/14764013.yaml',
        ),
        {
          encoding: 'utf-8',
        },
      ),
    ) as any
    assert.equal(
      decodeHistoryNetworkContentKey(testVector.content_key).contentType,
      HistoryNetworkContentType.Receipt,
    )
    const receipt = sszReceiptsListType.deserialize(hexToBytes(testVector.content_value))
    assert.equal(Receipt.fromEncodedReceipt(receipt[0]).cumulativeBlockGasUsed, 189807n)
  })
})
