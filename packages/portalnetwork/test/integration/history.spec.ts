import tape from 'tape'
import { ChildProcessWithoutNullStreams } from 'child_process'
import {
  PortalNetwork,
  ProtocolId,
  sszEncodeBlockBody,
  HistoryNetworkContentTypes,
  HeaderAccumulatorType,
  getHistoryNetworkContentId,
  HistoryNetworkContentKeyUnionType,
  HistoryProtocol,
  reassembleBlock,
  AccumulatorManager,
} from '../../src/index.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block, BlockHeader } from '@ethereumjs/block'
import { createRequire } from 'module'
import { connectAndTest, end } from './integrationTest.js'

const require = createRequire(import.meta.url)

tape('History Protocol Integration Tests', (t) => {
  t.test('Protocol should respond to request for HeaderRecord Proof', (st) => {
    const getProof = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      if (!protocol2 || !protocol1) throw new Error('should have History Protocol')
      const _accumulator = require('./testAccumulator.json')
      const _epoch1 = require('./testEpoch.json')
      const _block1000 = require('./testBlock1000.json')
      const _block8199 = require('./testBlock8199.json')
      const header1000 = BlockHeader.fromRLPSerializedHeader(
        Buffer.from(fromHexString(_block1000.rawHeader)),
        {
          hardforkByBlockNumber: true,
        }
      )
      const header8199 = BlockHeader.fromRLPSerializedHeader(
        Buffer.from(fromHexString(_block8199.rawHeader)),
        {
          hardforkByBlockNumber: true,
        }
      )
      const accumulator = HeaderAccumulatorType.deserialize(fromHexString(_accumulator))
      protocol1.accumulator = new AccumulatorManager({
        history: protocol1,
        storedAccumulator: accumulator,
      })
      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.EpochAccumulator,
        _epoch1.hash,
        fromHexString(_epoch1.serialized)
      )
      await protocol2.addContentToHistory(
        HistoryNetworkContentTypes.EpochAccumulator,
        _epoch1.hash,
        fromHexString(_epoch1.serialized)
      )
      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.BlockHeader,
        toHexString(header1000.hash()),
        header1000.serialize()
      )
      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.BlockHeader,
        toHexString(header8199.hash()),
        header8199.serialize()
      )
      await protocol2.addContentToHistory(
        HistoryNetworkContentTypes.BlockHeader,
        toHexString(header1000.hash()),
        header1000.serialize()
      )
      await protocol2.addContentToHistory(
        HistoryNetworkContentTypes.BlockHeader,
        toHexString(header8199.hash()),
        header8199.serialize()
      )

      portal2.on('Verified', async (blockHash, verified) => {
        st.equal(verified, true, 'Validated HeaderRecord from received Proof')
        if (blockHash === _block8199.hash) {
          if (verified) {
            st.pass('Header Record Validation test passed')
            end(child, [portal1, portal2], st)
          } else {
            st.fail('Header validation test failed')
            end(child, [portal1, portal2], st)
          }
        }
      })
      const proofKey1000 = HistoryNetworkContentKeyUnionType.serialize({
        selector: HistoryNetworkContentTypes.HeaderProof,
        value: {
          blockHash: header1000.hash(),
        },
      })
      const proofKey8199 = HistoryNetworkContentKeyUnionType.serialize({
        selector: HistoryNetworkContentTypes.HeaderProof,
        value: {
          blockHash: header8199.hash(),
        },
      })

      await protocol1.sendPing(portal2.discv5.enr)
      await protocol2.sendFindContent(portal1.discv5.enr.nodeId, proofKey1000)
      await protocol2.sendFindContent(portal1.discv5.enr.nodeId, proofKey8199)
    }
    connectAndTest(t, st, getProof, true)
  })
  t.test('Node should gossip new content to peer', (st) => {
    const gossip = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const testBlockData = require('./testBlocks.json')
      const testBlocks: Block[] = testBlockData.map((testBlock: any) => {
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
      portal2.on('ContentAdded', async (blockHash, contentType, _content) => {
        if (contentType === HistoryNetworkContentTypes.BlockHeader) {
          headers.includes(blockHash) || headers.push(blockHash)
          if (headers.length === testBlocks.length) {
            st.ok(
              testHashStrings.includes(blockHash),
              `Gossip sent ${headers.length} BlockHeaders to peer`
            )
          }
        }
        if (contentType === HistoryNetworkContentTypes.BlockBody) {
          blocks.includes(blockHash) || blocks.push(blockHash)
          if (blocks.length === testBlocks.length) {
            st.ok(
              testHashStrings.includes(blockHash),
              `Gossip sent ${blocks.length} BlockBodies to peer`
            )
            const header = fromHexString(
              await portal2.db.get(
                getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockHeader, blockHash)
              )
            )
            const body = fromHexString(
              await portal2.db.get(
                getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockBody, blockHash)
              )
            )
            const testBlock = testBlocks[testHashStrings.indexOf(blockHash)]
            const block = reassembleBlock(header, body)
            if (block.serialize().equals(testBlock.serialize())) {
              st.equal(
                blocks.length + headers.length,
                testBlocks.length * 2,
                `${
                  blocks.length / 13
                } batches of content were gossiped via history.gossipHistoryNetworkkContent()`
              )
              st.pass(`Gossip test passed`)
            } else {
              st.fail('Gossip Test failed')
            }
            end(child, [portal1, portal2], st)
          }
        }
      })
      await protocol1.sendPing(portal2.discv5.enr)
      testBlocks.forEach(async (testBlock: Block, idx: number) => {
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
      })
    }
    connectAndTest(t, st, gossip, true)
  })
  t.end()
})
