import { toHexString } from '@chainsafe/ssz'
import { Block, BlockHeader } from '@ethereumjs/block'
import { Common, Hardfork } from '@ethereumjs/common'
import { KECCAK256_RLP, bytesToHex, concatBytes, hexToBytes } from '@ethereumjs/util'
import { assert, assertType, describe, it } from 'vitest'

import {
  ContentKeyType,
  HistoryNetworkContentType,
  SHANGHAI_BLOCK,
  blockNumberToGindex,
  blockNumberToLeafIndex,
  decodeSszBlockBody,
  epochRootByBlocknumber,
  epochRootByIndex,
  getContentId,
  reassembleBlock,
  serializedContentKeyToContentId,
  sszEncodeBlockBody,
} from '../../../src/index.js'

import type { PostShanghaiBlockBodyContent } from '../../../src/index.js'

describe('utility functions', () => {
  const block1Hash = '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
  const block1headerContentKey = ContentKeyType.serialize(
    concatBytes(Uint8Array.from([HistoryNetworkContentType.BlockHeader]), hexToBytes(block1Hash)),
  )
  it('contentId functions', () => {
    assert.equal(
      getContentId(HistoryNetworkContentType.BlockHeader, block1Hash),
      serializedContentKeyToContentId(block1headerContentKey),
      'produced same content id',
    )
  })
  it('blockNumberToGindex', () => {
    assert.equal(blockNumberToGindex(1000n), 34768n, 'blockNumberToGindex returned correct gindex')
    assert.equal(blockNumberToGindex(9192n), 34768n, 'blockNumberToGindex returned correct gindex')
  })
  it('blockNumberToLeafIndex', () => {
    assert.equal(
      blockNumberToLeafIndex(1000n),
      2000,
      'blockNumberToLeafIndex returned correct leaf index',
    )
    assert.equal(
      blockNumberToLeafIndex(9192n),
      2000,
      'blockNumberToLeafIndex returned correct leaf index',
    )
  })
  it('epochRootByBlocknumber', () => {
    assert.equal(
      toHexString(epochRootByBlocknumber(1000n)!),
      '0x5ec1ffb8c3b146f42606c74ced973dc16ec5a107c0345858c343fc94780b4218',
      'epochRootByBlocknumber returned correct epoch root',
    )
    assert.equal(
      toHexString(epochRootByIndex(0)!),
      '0x5ec1ffb8c3b146f42606c74ced973dc16ec5a107c0345858c343fc94780b4218',
      'epochRootByIndex returned correct epoch root',
    )
  })
  it('epochRootByIndex', () => {
    assert.equal(
      toHexString(epochRootByBlocknumber(9192n)!),
      '0xa5364e9a9bc513c4601f0d62e6b46dbdedf3200bbfae54d6350f46f2c7a01938',
      'epochRootByBlocknumber returned correct epoch root',
    )
    assert.equal(
      toHexString(epochRootByIndex(1)!),
      '0xa5364e9a9bc513c4601f0d62e6b46dbdedf3200bbfae54d6350f46f2c7a01938',
      'epochRootByIndex returned correct epoch root',
    )
  })
})

describe('BlockBody ssz serialization/deserialization', () => {
  const block200031Rlp =
    '0xf904e8f901ffa0642010e58878e909266f0d72489494242401095578ce35096641ebf729e44ae3a063ccd1e45d688df2a7021d0adb0c07197d07b9e2585f94a22dc98d95b09759aa94580992b51e3925e23280efb93d3047c82f17e038a0d8893ed24819816252a288b04357f5216824457946a0a7c4855a431d472e65e2a05cda0425b7d9d85346601f227cfc14d65b9f3a05270f054387ec40de32f77108a08f12d3c5dd70daec6dfbafce658f2b004d100f3d7ca974dfc9ed690761a62152b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605aae2d113eb83030d5f832fefd882a4108455ee048c80a051322814cc17686959c70ca0d33c8480c6193b829300681cb5da44a23ce5a6f688687d504c9e038b6df8e1f86f822d8a850ba43b740083015f90949a6ae9cec80b30efb1ca59e3074c6013cfda582e880ddd431062aa8c00801ca00a1751859b131193f48a7f63c82cbc61689d52551907fc5418026f479795d4a9a07515ad3f692fca2587a43bd5b2ff0a53566811b898d589eb369b91bcf9afba6cf86e822d8b850ba43b740083015f90947c5080988c6d91d090c23d54740f856c69450b29875c6b0a565a8c00801ba0e37e9e1a9ece55d007043ed6a2cf80d3fa665460c16114d647cc9fdaa1caa64ba03cc320f18c7b6ba4f56b7b90f6d09e2fcf78d30520bc24004570d3bfcf21b9a5f90200f901fda05742019e0c07bbfdf2dcd8be5ea6f1191ca573c07db7f90004af033a49058f7da01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794f8b483dba2c3b7176a3da549ad41a48bb3121069a0cdc188c634e79fb1a66d020ea5c6d200ded0fb4be5acad0dd6e0acf9d83d0394a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605ac4dcdd62683030d5d832fefd8808455ee042a80a0c66d672b0a4ac8c1b42e8a2cccd3b78ecfc2b02a121586c4b6e5ad12c37fc9cf886183132d2c736336'
  const block = Block.fromRLPSerializedBlock(hexToBytes(block200031Rlp), {
    setHardfork: true,
  })
  const encodedBody = sszEncodeBlockBody(block)
  const encodedHeader = block.header.serialize()
  const reassembledBlock = reassembleBlock(encodedHeader, encodedBody)
  it('sszEncodeBlockBody', () => {
    assert.equal(
      bytesToHex(block.header.hash()),
      bytesToHex(reassembledBlock.header.hash()),
      'was able to ssz serialize and deserialize a block',
    )
  })
})

describe('BlockHeader ssz serialization/deserialization with pre and post shanghai blocks', () => {
  it('should serialize and deserialize pre and post shanghai blocks', async () => {
    const preShanghaiBlockJson = await import('./testData/block31591.json')
    const postShanghaiBlockJson = await import('./testData/block18529207.json')

    const preShanghaiBlock = Block.fromRPC(preShanghaiBlockJson, undefined, {
      setHardfork: true,
    })
    const postShanghaiBlock = Block.fromRPC(postShanghaiBlockJson, undefined, {
      setHardfork: true,
    })

    const preEncoded = sszEncodeBlockBody(preShanghaiBlock)
    const postEncoded = sszEncodeBlockBody(postShanghaiBlock)
    assertType<Uint8Array>(preEncoded)
    assertType<Uint8Array>(postEncoded)

    const deserializedPreBlock = decodeSszBlockBody(preEncoded, false)
    const deserializedPostBlock = decodeSszBlockBody(
      postEncoded,
      true,
    ) as PostShanghaiBlockBodyContent
    assert.equal(deserializedPreBlock['allWithdrawals'], undefined)
    assert.ok(
      deserializedPostBlock.allWithdrawals !== undefined &&
        deserializedPostBlock.allWithdrawals.length === 16,
      'deserialized post shanghai block body with withdrawals',
    )
  })
  it('should serialize a post-shanghai block when no body is included', () => {
    const common = new Common({ chain: 'mainnet', hardfork: Hardfork.Shanghai })
    common.setHardfork(Hardfork.Shanghai)
    const header = BlockHeader.fromHeaderData(
      { number: SHANGHAI_BLOCK + 1n, timestamp: 1681338455n },
      { setHardfork: true, common },
    )
    const block = reassembleBlock(header.serialize(), undefined)
    assert.deepEqual(
      block.header.withdrawalsRoot,
      KECCAK256_RLP,
      'instantiated a post shanghai block with no  body so withdrawals array is empty',
    )
  })
})
