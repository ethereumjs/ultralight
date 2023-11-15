import { ENR, EntryStatus } from '@chainsafe/discv5'
import { Block, BlockHeader } from '@ethereumjs/block'
import * as RLP from '@ethereumjs/rlp'
import { concatBytes, hexToBytes } from '@ethereumjs/util'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import * as td from 'testdouble'
import { assert, describe, it } from 'vitest'

import {
  BlockHeaderWithProof,
  ContentKeyType,
  EpochAccumulator,
  HistoryNetworkContentType,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  epochRootByBlocknumber,
  getContentKey,
  reassembleBlock,
  sszEncodeBlockBody,
  toHexString,
} from '../../../src/index.js'

import type { HistoryNetwork } from '../../../src/index.js'
import type { BlockBytes } from '@ethereumjs/block'

const require = createRequire(import.meta.url)
const testBlocks = require('../../testData/testBlocksForHistory.json')

describe('history Network FINDCONTENT/FOUNDCONTENT message handlers', async () => {
  const block1Rlp = testBlocks.block1.blockRlp
  const block1Hash = testBlocks.block1.blockHash
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedNetworks: [NetworkId.HistoryNetwork],
  })

  const network = node.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const remoteEnr =
    'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q'
  const decodedEnr = ENR.decodeTxt(remoteEnr)
  network.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
  const key = getContentKey(
    HistoryNetworkContentType.BlockBody,
    hexToBytes('0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'),
  )

  const findContentResponse = Uint8Array.from([5, 1, 97, 98, 99])
  network.store = td.func<any>()
  network.validateHeader = td.func<any>()
  // network.sendFindContent = td.func<any>()
  network.sendMessage = td.func<any>()

  td.when(
    network.sendMessage(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()),
  ).thenResolve(findContentResponse)
  const res = await network.sendFindContent(decodedEnr.nodeId, hexToBytes(key))
  it('should send a FINDCONTENT message', () => {
    assert.deepEqual(
      res?.value,
      Uint8Array.from([97, 98, 99]),
      'got correct response for content abc',
    )
  })

  // TODO: Write good `handleFindContent` tests

  td.reset()

  await network.store(HistoryNetworkContentType.BlockHeader, block1Hash, hexToBytes(block1Rlp))
  const contentKey = ContentKeyType.serialize(
    concatBytes(Uint8Array.from([HistoryNetworkContentType.BlockHeader]), hexToBytes(block1Hash)),
  )
  const header = await network.sendFindContent('0xabcd', contentKey)
  it('should send a FINDCONTENT message for a block header', () => {
    assert.equal(header, undefined, 'received undefined for unknown peer')
  })
})

describe('store -- Headers and Epoch Accumulators', async () => {
  it('Should store and retrieve block header from DB', async () => {
    const epoch =
      '0x' +
      readFileSync(
        './test/networks/history/testData/0x035ec1ffb8c3b146f42606c74ced973dc16ec5a107c0345858c343fc94780b4218.portalcontent',
        { encoding: 'hex' },
      )
    const node = await PortalNetwork.create({
      transport: TransportLayer.WEB,
      supportedNetworks: [NetworkId.HistoryNetwork],
    })
    const network = node.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const block1Rlp =
      '0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4'
    const block1Hash = '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
    await network.store(
      HistoryNetworkContentType.EpochAccumulator,
      '0x5ec1ffb8c3b146f42606c74ced973dc16ec5a107c0345858c343fc94780b4218',
      hexToBytes(epoch),
    )
    const proof = await network.generateInclusionProof(1n)
    await network.store(
      HistoryNetworkContentType.BlockHeader,
      block1Hash,
      BlockHeaderWithProof.serialize({
        header: hexToBytes(block1Rlp),
        proof: {
          selector: 1,
          value: proof,
        },
      }),
    )
    const contentKey = getContentKey(HistoryNetworkContentType.BlockHeader, hexToBytes(block1Hash))

    const val = await node.db.get(NetworkId.HistoryNetwork, contentKey)
    const headerWith = BlockHeaderWithProof.deserialize(hexToBytes(val))
    const header = BlockHeader.fromRLPSerializedHeader(headerWith.header, {
      setHardfork: true,
    })
    assert.equal(header.number, 1n, 'retrieved block header based on content key')
  })

  it('Should store and retrieve an EpochAccumulator from DB', async () => {
    const node = await PortalNetwork.create({
      transport: TransportLayer.WEB,
      supportedNetworks: [NetworkId.HistoryNetwork],
    })
    const network = node.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const epochAccumulator = require('../../testData/testEpoch.json')
    const rebuilt = EpochAccumulator.deserialize(hexToBytes(epochAccumulator.serialized))
    const hashRoot = EpochAccumulator.hashTreeRoot(rebuilt)
    const contentKey = getContentKey(HistoryNetworkContentType.EpochAccumulator, hashRoot)
    await network.store(
      HistoryNetworkContentType.EpochAccumulator,
      toHexString(hashRoot),
      hexToBytes(epochAccumulator.serialized),
    )
    const fromDB = await network.retrieve(contentKey)
    assert.equal(fromDB, epochAccumulator.serialized, 'Retrieve EpochAccumulator test passed.')
  })
})

describe('store -- Block Bodies and Receipts', async () => {
  const node = await PortalNetwork.create({
    transport: TransportLayer.WEB,
    supportedNetworks: [NetworkId.HistoryNetwork],
  })
  const network = node.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const serializedBlock = testBlocks.block207686
  const blockRlp = RLP.decode(hexToBytes(serializedBlock.blockRlp))
  const block = Block.fromValuesArray(blockRlp as BlockBytes, { setHardfork: true })
  const epoch =
    '0x' +
    readFileSync(
      './test/networks/history/testData/0x03987cb6206e5bae4b68ce0eeb6c05ae090d02b7331e47d1705a2a515ac88475aa.portalcontent',
      { encoding: 'hex' },
    )
  const epochHash = '0x987cb6206e5bae4b68ce0eeb6c05ae090d02b7331e47d1705a2a515ac88475aa'

  await network.store(HistoryNetworkContentType.EpochAccumulator, epochHash, hexToBytes(epoch))
  const _epochHash = toHexString(epochRootByBlocknumber(207686n)!)
  it('Should store and retrieve a block body from DB', async () => {
    assert.equal(epochHash, _epochHash, 'Epoch hash matches expected value')
  })

  const proof = await network.generateInclusionProof(207686n)
  const headerWithProof = BlockHeaderWithProof.serialize({
    header: block.header.serialize(),
    proof: {
      selector: 1,
      value: proof,
    },
  })
  network.store(HistoryNetworkContentType.BlockHeader, serializedBlock.blockHash, headerWithProof)
  await network.store(
    HistoryNetworkContentType.BlockBody,
    serializedBlock.blockHash,
    sszEncodeBlockBody(block),
  )
  const header = BlockHeaderWithProof.deserialize(
    hexToBytes(
      await network.get(
        NetworkId.HistoryNetwork,
        getContentKey(HistoryNetworkContentType.BlockHeader, hexToBytes(serializedBlock.blockHash)),
      ),
    ),
  ).header
  const body = await network.get(
    NetworkId.HistoryNetwork,
    getContentKey(HistoryNetworkContentType.BlockBody, hexToBytes(serializedBlock.blockHash)),
  )
  const rebuilt = reassembleBlock(header, hexToBytes(body!))

  it('Should store and retrieve a block body from DB', async () => {
    assert.equal(
      rebuilt.header.number,
      block.header.number,
      'reassembled block from components in DB',
    )
  })
  const receipt = await network.saveReceipts(block)
  it('Should store and retrieve block receipts from DB', async () => {
    assert.equal(receipt[0].cumulativeBlockGasUsed, 43608n, 'correctly generated block receipts')
  })
})

describe('Header Proof Tests', async () => {
  const _epoch1Hash = '0x5ec1ffb8c3b146f42606c74ced973dc16ec5a107c0345858c343fc94780b4218'
  const _epochRaw =
    '0x' +
    readFileSync(
      './test/networks/history/testData/0x035ec1ffb8c3b146f42606c74ced973dc16ec5a107c0345858c343fc94780b4218.portalcontent',
      { encoding: 'hex' },
    )
  const _epoch1 = EpochAccumulator.deserialize(hexToBytes(_epochRaw))
  const node = await PortalNetwork.create({
    transport: TransportLayer.WEB,
    supportedNetworks: [NetworkId.HistoryNetwork],
  })
  const network = node.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  // network.accumulator.replaceAccumulator(accumulator)
  it('HistoryNetwork can create and verify proofs for a HeaderRecord from an EpochAccumulator', async () => {
    const _block1000 = require('../../testData/testBlock1000.json')
    await network.store(
      HistoryNetworkContentType.EpochAccumulator,
      _epoch1Hash,
      hexToBytes(_epochRaw),
    )
    const proof = await network.generateInclusionProof(1000n)
    const headerWith = BlockHeaderWithProof.serialize({
      header: hexToBytes(_block1000.rawHeader),
      proof: {
        selector: 1,
        value: proof,
      },
    })
    await network.store(HistoryNetworkContentType.BlockHeader, _block1000.hash, headerWith)
    assert.equal(proof.length, 15, 'Proof has correct size')
    assert.ok(
      network.verifyInclusionProof(proof, _block1000.hash, 1000n),
      'History Network verified an inclusion proof from a historical epoch.',
    )
    assert.ok(true, 'TODO: fix this test')
  })
})
