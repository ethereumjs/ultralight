import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { ChildProcessWithoutNullStreams } from 'child_process'
import { createRequire } from 'module'
import tape from 'tape'
import {
  HistoryNetworkContentTypes,
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  sszEncodeBlockBody,
} from '../../src/index.js'
import { connectAndTest, end } from './integrationTest.js'

const require = createRequire(import.meta.url)

tape('History Protocol Integration Tests', (t) => {
  t.test('Node should gossip new content to peer', (st) => {
    const gossip = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const testBlockData = require('./testBlocks.json')
      const testBlocks: Block[] = testBlockData.slice(0, 26).map((testBlock: any) => {
        return Block.fromRLPSerializedBlock(Buffer.from(fromHexString(testBlock.rlp)), {
          hardforkByBlockNumber: true,
        })
      })

      const testHashes: Uint8Array[] = testBlocks.map((testBlock: Block) => {
        return testBlock.hash()
      })
      const testHashStrings: string[] = testHashes.map((testHash: Uint8Array) => {
        return toHexString(testHash)
      })

      const headers: string[] = []
      const blocks: string[] = []
      portal2.uTP.on('Stream', async (contentType, blockHash, _content) => {
        if (contentType === HistoryNetworkContentTypes.BlockHeader) {
          if (headers.push(blockHash) === 26) {
            st.ok(
              testHashStrings.includes(blockHash),
              `Gossip sent ${headers.length} BlockHeaders to peer`
            )
          }
        }
        if (contentType === HistoryNetworkContentTypes.BlockBody) {
          if (blocks.push(blockHash) === 26) {
            st.ok(
              testHashStrings.includes(blockHash),
              `Gossip sent ${blocks.length} BlockBodies to peer`
            )
          }
        }
        if (blocks.length === 26 && headers.length === 26) {
          st.pass(`Gossip test passed`)
          end(child, [portal1, portal2], st)
        }
      })
      await protocol1.sendPing(portal2.discv5.enr)
      for await (const [idx, testBlock] of testBlocks.entries()) {
        await protocol1.addContentToHistory(
          HistoryNetworkContentTypes.BlockHeader,
          testHashStrings[idx],
          testBlock.header.serialize()
        )
        await protocol1.addContentToHistory(
          HistoryNetworkContentTypes.BlockBody,
          testHashStrings[idx],
          sszEncodeBlockBody(testBlock)
        )
      }
    }
    connectAndTest(t, st, gossip, true)
  })
  t.end()
})
