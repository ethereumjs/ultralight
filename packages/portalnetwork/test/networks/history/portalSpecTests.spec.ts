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
  HistoricalHashesAccumulator,
  decodeHistoryNetworkContentKey,
  hexToBytes,
} from '../../../src/index.js'

describe('Accumulator spec tests', () => {
  it('should deserialize the master accumulator', () => {
    const acc = readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/history/accumulator/historical_hashes_accumulator.ssz',
      ),
    )
    const masterAccumulator = HistoricalHashesAccumulator.deserialize(acc)
    assert.equal(masterAccumulator.historicalEpochs.length, 1897)
  })
  it('should deserialize an epoch accumulator', () => {
    const acc = readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/history/accumulator/epoch-record-00122.ssz',
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
    const key = decodeHistoryNetworkContentKey(hexToBytes(testVector.content_key))
    assert.equal(key.contentType, 1)
    const body = BlockBodyContentType.deserialize(hexToBytes(testVector.content_value))
    const tx0Hash = bytesToHex(
      TransactionFactory.fromSerializedData(body.allTransactions[0]).hash(),
    )
    assert.equal(tx0Hash, '0x163dae461ab32787eaecdad0748c9cf5fe0a22b443bc694efae9b80e319d9559')
  })
})

describe('pre-merge header tests', () => {
  it('should deserialize pre-merge header with proof', () => {
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
      bytesToHex((headerWithProof.proof.value! as Uint8Array[])[0]),
      '0xcead98e305c70563000000000000000000000000000000000000000000000000',
    )
  })
})

// describe('post merge header proof tests', () => {
//   // TODO: Update once updated spec tests are released with correct proof construction
//   it.skip('should serialize and deserialize a HistoralRootsBlockProof')
//   const testString = readFileSync(
//     resolve(
//       __dirname,
//       '../../../../portal-spec-tests/tests/mainnet/history/headers_with_proof/block_proofs_bellatrix/beacon_block_proof-15539558-cdf9ed89b0c43cda17398dc4da9cfc505e5ccd19f7c39e3b43474180f1051e01.yaml',
//     ),
//     {
//       encoding: 'utf-8',
//     },
//   )
//   const testVector: {
//     execution_block_header: string
//     beacon_block_header_proof: string
//     beacon_block_header_root: string
//     historical_roots_proof: string
//     slot: string
//   } = yaml.load(testString) as any
//   const historicalRootsHeaderProof = HistoricalRootsBlockProof.fromJson({
//     beaconBlockHeaderProof: testVector.beacon_block_header_proof,
//     historicalRootsProof: testVector.historical_roots_proof,
//     slot: testVector.slot,
//     beaconBlockHeaderRoot: testVector.beacon_block_header_root,
//   })
//   assert.equal(historicalRootsHeaderProof.slot, 4702208n)
// })
