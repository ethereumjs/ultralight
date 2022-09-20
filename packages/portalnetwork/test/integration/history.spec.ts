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
  HeaderAccumulator,
  HistoryProtocol,
  EpochAccumulator,
  reassembleBlock,
  AccumulatorManager,
} from '../../src/index.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block, BlockHeader } from '@ethereumjs/block'
import { createRequire } from 'module'
import { connectAndTest, end } from './integrationTest.js'

const require = createRequire(import.meta.url)

const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
  selector: 4,
  value: { selector: 0, value: null },
})

tape('History Protocol Integration Tests', (t) => {
  const blocks = require('./snapshotBlocks.json')
  const epoch = require('./testEpoch.json')

  t.test('Nodes should share and validate a snapshot with header proofs', (st) => {
    const findAccumulator = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      for (const block of blocks) {
        portal1.db.put(getHistoryNetworkContentId(0, block.hash), block.rawHeader)
      }
      portal1.db.put(getHistoryNetworkContentId(3, epoch.hash), epoch.serialized)
      const testAccumulator = require('./testAccumulator.json')
      const desAccumulator = HeaderAccumulatorType.deserialize(fromHexString(testAccumulator))
      const rebuiltAccumulator = new HeaderAccumulator({ storedAccumulator: desAccumulator })

      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.HeaderAccumulator,
        toHexString(accumulatorKey),
        fromHexString(testAccumulator)
      )
      await protocol2.addContentToHistory(
        HistoryNetworkContentTypes.BlockHeader,
        blocks[1000].hash,
        fromHexString(blocks[1000].rawHeader)
      )
      portal2.on('Verified', (key, validated) => {
        if (key === '') {
          st.ok(validated, 'Correctly validated header accumulator')
        }
      })
      portal2.on('ContentAdded', async (blockHash, contentType, content) => {
        if (contentType !== HistoryNetworkContentTypes.EpochAccumulator) {
          const _desAccumulator = HeaderAccumulatorType.deserialize(fromHexString(content))
          const _rebuiltAccumulator = new HeaderAccumulator({ storedAccumulator: _desAccumulator })
          st.equal(
            _rebuiltAccumulator.currentHeight(),
            8999,
            'Streamed accumulator matches test data'
          )

          const history = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
          st.equal(
            contentType,
            HistoryNetworkContentTypes.HeaderAccumulator,
            'Accumulator received with correct contentType'
          )
          st.equal(
            blockHash,
            toHexString(Uint8Array.from([])),
            'Accumulator received with correct contentKey'
          )
          st.equal(
            history.accumulator.currentHeight(),
            rebuiltAccumulator.currentHeight(),
            `Accumulator current Epoch received matches test Accumulator's current Epoch`
          )
          end(child, [portal1, portal2], st)
        }
      })

      await protocol1.sendPing(portal2.discv5.enr)
      await protocol2.sendFindContent(portal1.discv5.enr.nodeId, accumulatorKey)
    }
    connectAndTest(t, st, findAccumulator, true)
  })
  t.test('Nodes should share accumulator, but fail to verify', (st) => {
    const findAccumulator = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      if (!protocol2 || !protocol1) throw new Error('should have History Protocol')
      const testAccumulator = require('./testAccumulator.json')
      const desAccumulator = HeaderAccumulatorType.deserialize(fromHexString(testAccumulator))
      const rebuiltAccumulator = new HeaderAccumulator({ storedAccumulator: desAccumulator })
      const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 4,
        value: { selector: 0, value: null },
      })

      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.HeaderAccumulator,
        toHexString(accumulatorKey),
        fromHexString(testAccumulator)
      )
      portal2.on('Verified', (blockHash, verified) => {
        if (blockHash === '') {
          st.notOk(verified, 'History should fail to validate Accumulator Snapshot')
        }
      })
      portal2.on('ContentAdded', async (blockHash, contentType, content) => {
        const _desAccumulator = HeaderAccumulatorType.deserialize(fromHexString(content))
        const _rebuiltAccumulator = new HeaderAccumulator({ storedAccumulator: _desAccumulator })
        st.equal(
          _rebuiltAccumulator.currentHeight(),
          8999,
          'Streamed accumulator matches test data'
        )

        const history = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
        st.equal(
          contentType,
          HistoryNetworkContentTypes.HeaderAccumulator,
          'Accumulator received with correct contentType'
        )
        st.equal(
          blockHash,
          toHexString(Uint8Array.from([])),
          'Accumulator received with correct contentKey'
        )
        st.equal(
          history.accumulator.currentHeight(),
          rebuiltAccumulator.currentHeight(),
          `Accumulator current Epoch received matches test Accumulator's current Epoch`
        )
        end(child, [portal1, portal2], st)
      })
      // end(child, [portal1, portal2], st)

      await protocol1.sendPing(portal2.discv5.enr)
      await protocol2.sendFindContent(portal1.discv5.enr.nodeId, accumulatorKey)
    }
    connectAndTest(t, st, findAccumulator, true)
  })

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
        HistoryNetworkContentTypes.HeaderAccumulator,
        toHexString(accumulatorKey),
        HeaderAccumulatorType.serialize(accumulator)
      )
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
  t.test(
    'Node should request a HeaderAccumulator, then request an EpochAccumulator from the historical_epochs',
    (st) => {
      const accumulatorData = require('./testAccumulator.json')
      const epochData = require('./testEpoch.json')
      const epochHash = epochData.hash
      const serialized = epochData.serialized
      const epochKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 3,
        value: {
          blockHash: fromHexString(epochHash),
        },
      })
      const findEpoch = async (
        portal1: PortalNetwork,
        portal2: PortalNetwork,
        child: ChildProcessWithoutNullStreams
      ) => {
        const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
        const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
        const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
          selector: 4,
          value: { selector: 0, value: null },
        })
        await protocol1.addContentToHistory(
          HistoryNetworkContentTypes.HeaderAccumulator,
          toHexString(accumulatorKey),
          fromHexString(accumulatorData)
        )
        await protocol1.addContentToHistory(
          HistoryNetworkContentTypes.EpochAccumulator,
          toHexString(epochKey),
          fromHexString(serialized)
        )

        portal2.on('ContentAdded', async (blockHash, contentType, content) => {
          if (contentType === HistoryNetworkContentTypes.HeaderAccumulator) {
            const headerAccumulator = HeaderAccumulatorType.deserialize(fromHexString(content))
            const _epochHash = toHexString(headerAccumulator.historicalEpochs[0])
            st.equal(
              _epochHash,
              epochHash,
              'Received Accumulator has historical epoch hash for blocks 0 - 8191.'
            )
            await protocol2.sendFindContent(portal1.discv5.enr.nodeId, epochKey)
          }
          if (contentType === HistoryNetworkContentTypes.EpochAccumulator) {
            st.equal(
              contentType,
              HistoryNetworkContentTypes.EpochAccumulator,
              'FINDCONTENT has returned an EpochAccumulator'
            )
            const _epochAccumulator = EpochAccumulator.deserialize(fromHexString(content))
            const _epochAccumulatorHash = toHexString(
              EpochAccumulator.hashTreeRoot(_epochAccumulator)
            )
            const _block1000Hash = toHexString(_epochAccumulator[1000].blockHash)
            st.equal(
              _epochAccumulatorHash,
              epochData.hash,
              'Epoch Accumulator has correct hash tree root'
            )
            st.equal(
              _block1000Hash,
              '0x5b4590a9905fa1c9cc273f32e6dc63b4c512f0ee14edc6fa41c26b416a7b5d58',
              'EpochAccumulator has valid hash for block 1000'
            )
            st.equal(content, epochData.serialized, 'EpochAccumulator matches test Data')
            const contentId = getHistoryNetworkContentId(3, blockHash)
            const stored = await portal2.db.get(contentId)
            st.equal(stored, epochData.serialized, 'EpochAccumulator stored in db')
            end(child, [portal1, portal2], st)
          }
        })

        await protocol1.sendPing(portal2.discv5.enr)
        await protocol2.sendFindContent(portal1.discv5.enr.nodeId, accumulatorKey)
      }
      connectAndTest(t, st, findEpoch, true)
    }
  )
  t.end()
})
