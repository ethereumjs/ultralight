import tape from 'tape'
import { ChildProcessWithoutNullStreams } from 'child_process'
import { PortalNetwork, ProtocolId, sszEncodeBlockBody } from '../../src/index.js'
import {
  HistoryNetworkContentTypes,
  HeaderAccumulatorType,
} from '../../src/subprotocols/history/types.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import {
  getHistoryNetworkContentId,
  HistoryNetworkContentKeyUnionType,
  HeaderAccumulator,
} from '../../src/subprotocols/history/index.js'
import { Block, BlockHeader } from '@ethereumjs/block'
import {
  HistoryProtocol,
  EpochAccumulator,
  reassembleBlock,
} from '../../src/subprotocols/history/index.js'
import { createRequire } from 'module'
import { connectAndTest, end } from './integrationTest.js'

const require = createRequire(import.meta.url)

tape('History Protocol Integration Tests', (t) => {
  const blocks = require('./snapshotBlocks.json')
  const epoch = require('./testEpoch.json')
  t.test('Nodes should share accumulator snapshot with FINDCONTENT / FOUNDCONTENT', (st) => {
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
        1,
        HistoryNetworkContentTypes.HeaderAccumulator,
        toHexString(accumulatorKey),
        fromHexString(testAccumulator)
      )
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
  t.test('Nodes should share and validate a snapshot with header proofs', (st) => {
    const findAccumulator = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      for (const block of blocks) {
        portal1.db.put(getHistoryNetworkContentId(1, 0, block.hash), block.rawHeader)
      }
      portal1.db.put(getHistoryNetworkContentId(1, 3, epoch.hash), epoch.serialized)
      if (!protocol2 || !protocol1) throw new Error('should have History Protocol')
      const testAccumulator = require('./testAccumulator.json')
      const desAccumulator = HeaderAccumulatorType.deserialize(fromHexString(testAccumulator))
      const rebuiltAccumulator = new HeaderAccumulator({ storedAccumulator: desAccumulator })
      const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 4,
        value: { selector: 0, value: null },
      })

      await protocol1.addContentToHistory(
        1,
        HistoryNetworkContentTypes.HeaderAccumulator,
        toHexString(accumulatorKey),
        fromHexString(testAccumulator)
      )
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
      // end(child, [portal1, portal2], st)

      await protocol1.sendPing(portal2.discv5.enr)
      await protocol2.sendFindContent(portal1.discv5.enr.nodeId, accumulatorKey)
    }
    connectAndTest(t, st, findAccumulator, true)
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
                getHistoryNetworkContentId(1, HistoryNetworkContentTypes.BlockHeader, blockHash)
              )
            )
            const body = fromHexString(
              await portal2.db.get(
                getHistoryNetworkContentId(1, HistoryNetworkContentTypes.BlockBody, blockHash)
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
          1,
          HistoryNetworkContentTypes.BlockHeader,
          testHashStrings[idx],
          testBlock.header.serialize()
        )
        await protocol1.addContentToHistory(
          1,
          HistoryNetworkContentTypes.BlockBody,
          testHashStrings[idx],
          sszEncodeBlockBody(testBlock)
        )
      })
    }
    connectAndTest(t, st, gossip, true)
  })
  // t.test('Protocol should respond to request for HeaderRecord Proof', (st) => {
  //   const getProof = async (
  //     portal1: PortalNetwork,
  //     portal2: PortalNetwork,
  //     child: ChildProcessWithoutNullStreams
  //   ) => {
  //     const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  //     const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  //     if (!protocol2 || !protocol1) throw new Error('should have History Protocol')
  //     const _accumulator = require('./testAccumulator.json')
  //     const _epoch1 = require('./testEpoch.json')
  //     const _block1000 = require('./testBlock1000.json')
  //     const _block8199 = require('./testBlock8199.json')
  //     const header1000 = BlockHeader.fromRLPSerializedHeader(
  //       Buffer.from(fromHexString(_block1000.rawHeader)),
  //       {
  //         hardforkByBlockNumber: true,
  //       }
  //     )
  //     const header8199 = BlockHeader.fromRLPSerializedHeader(
  //       Buffer.from(fromHexString(_block8199.rawHeader)),
  //       {
  //         hardforkByBlockNumber: true,
  //       }
  //     )
  //     const accumulator = HeaderAccumulatorType.deserialize(fromHexString(_accumulator))
  //     protocol1.accumulator = new HeaderAccumulator({ storedAccumulator: accumulator })
  //     protocol2.accumulator = new HeaderAccumulator({ storedAccumulator: accumulator })
  //     await protocol1.addContentToHistory(
  //       1,
  //       HistoryNetworkContentTypes.EpochAccumulator,
  //       _epoch1.hash,
  //       fromHexString(_epoch1.serialized)
  //     )
  //     await protocol2.addContentToHistory(
  //       1,
  //       HistoryNetworkContentTypes.EpochAccumulator,
  //       _epoch1.hash,
  //       fromHexString(_epoch1.serialized)
  //     )
  //     await protocol1.addContentToHistory(
  //       1,
  //       HistoryNetworkContentTypes.BlockHeader,
  //       toHexString(header1000.hash()),
  //       header1000.serialize()
  //     )
  //     await protocol1.addContentToHistory(
  //       1,
  //       HistoryNetworkContentTypes.BlockHeader,
  //       toHexString(header8199.hash()),
  //       header8199.serialize()
  //     )
  //     await protocol2.addContentToHistory(
  //       1,
  //       HistoryNetworkContentTypes.BlockHeader,
  //       toHexString(header1000.hash()),
  //       header1000.serialize()
  //     )
  //     await protocol2.addContentToHistory(
  //       1,
  //       HistoryNetworkContentTypes.BlockHeader,
  //       toHexString(header8199.hash()),
  //       header8199.serialize()
  //     )
  //     portal2.on('Verified', async (blockHash, verified) => {
  //       st.equal(verified, true, 'Validated HeaderRecord from received Proof')
  //       if (blockHash === _block8199.hash) {
  //         if (verified) {
  //           st.pass('Header Record Validation test passed')
  //           end(child, [portal1, portal2], st)
  //         } else {
  //           st.fail('Header validation test failed')
  //           end(child, [portal1, portal2], st)
  //         }
  //       }
  //     })
  //     const proofKey1000 = HistoryNetworkContentKeyUnionType.serialize({
  //       selector: HistoryNetworkContentTypes.HeaderProof,
  //       value: {
  //         chainId: 1,
  //         blockHash: fromHexString(_block1000.hash),
  //       },
  //     })
  //     const proofKey8199 = HistoryNetworkContentKeyUnionType.serialize({
  //       selector: 5,
  //       value: {
  //         chainId: 1,
  //         blockHash: header8199.hash(),
  //       },
  //     })

  //     await protocol1.sendPing(portal2.discv5.enr)
  //     await protocol2.sendFindContent(portal1.discv5.enr.nodeId, proofKey1000)
  //     await protocol2.sendFindContent(portal1.discv5.enr.nodeId, proofKey8199)
  //   }
  //   connectAndTest(t, st, getProof, true)
  // })
  t.end()
})

tape('getBlockByHash', (t) => {
  t.test('eth_getBlockByHash test', (st) => {
    const gossip = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const testBlockData = require('./testBlocks.json')
      const idx = Math.floor(Math.random() * testBlockData.length)
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

      portal2.on('ContentAdded', async (blockHash, contentType, _content) => {
        if (contentType === HistoryNetworkContentTypes.BlockHeader) {
          st.equal(testHashStrings[idx], blockHash, `eth_getBlockByHash retrieved a blockHash`)
        }
        if (contentType === HistoryNetworkContentTypes.BlockBody) {
          st.equal(testHashStrings[idx], blockHash, `eth_getBlockByHash retrieved a block body`)
          const header = fromHexString(
            await portal2.db.get(
              getHistoryNetworkContentId(1, HistoryNetworkContentTypes.BlockHeader, blockHash)
            )
          )
          const body = fromHexString(
            await portal2.db.get(
              getHistoryNetworkContentId(1, HistoryNetworkContentTypes.BlockBody, blockHash)
            )
          )
          const testBlock = testBlocks[testHashStrings.indexOf(blockHash)]
          const block = reassembleBlock(header, body)
          st.deepEqual(
            block.serialize(),
            testBlock.serialize(),
            `eth_getBlockByHash retrieved a Block from History Network`
          )
          end(child, [portal1, portal2], st)
        }
      })
      testBlocks.forEach(async (testBlock: Block, idx: number) => {
        await protocol1.addContentToHistory(
          1,
          HistoryNetworkContentTypes.BlockHeader,
          testHashStrings[idx],
          testBlock.header.serialize()
        )
        await protocol1.addContentToHistory(
          1,
          HistoryNetworkContentTypes.BlockBody,
          testHashStrings[idx],
          sszEncodeBlockBody(testBlock)
        )
      })
      await protocol1.sendPing(portal2.discv5.enr)
      const returnedBlock = (await protocol2.getBlockByHash(testHashStrings[idx], true)) as Block
      st.deepEqual(returnedBlock.hash(), testBlocks[idx].hash(), 'eth_getBlockByHash test passed')
    }
    connectAndTest(t, st, gossip, true)
  })
  t.test('eth_getBlockByHash test -- no body available', (st) => {
    const getBlock = async (portal1: PortalNetwork, portal2: PortalNetwork) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const testBlockData = require('./testBlock.json')
      const testBlock: Block = Block.fromRLPSerializedBlock(
        Buffer.from(fromHexString(testBlockData[0].rlp)),
        {
          hardforkByBlockNumber: true,
        }
      )
      const testHash = toHexString(testBlock.hash())
      const testHeader = testBlock.header.serialize()
      await protocol1.addContentToHistory(1, 0, testHash, testHeader)

      await protocol1.sendPing(portal2.discv5.enr)
      const returnedBlock = (await protocol2.getBlockByHash(testHash, true)) as Block
      st.deepEqual(
        returnedBlock.header.hash(),
        testBlock.header.hash(),
        'eth_getBlockByHash test passed'
      )
      const _h = await portal2.db.get(getHistoryNetworkContentId(1, 0, testHash))
      st.equal(_h, toHexString(testHeader), 'eth_getBlockByHash returned a Block Header')

      try {
        await portal2.db.get(getHistoryNetworkContentId(1, 1, testHash))
        st.fail('should not find block body')
      } catch (e: any) {
        st.equal(
          e.message,
          'NotFound',
          'eth_getBlockByHash returned a BlockHeader when a BlockBody could not be found'
        )
      }
    }
    connectAndTest(t, st, getBlock)
  })
})

tape('getBlockByNumber', (t) => {
  t.test('eth_getBlockByNumber test', (st) => {
    const findAccumulator = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      if (!protocol2 || !protocol1) throw new Error('should have History Protocol')
      const testAccumulator = require('./testAccumulator.json')
      const testBlockData = require('./testBlock.json')
      const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 4,
        value: { selector: 0, value: null },
      })

      const block8200Hash = testBlockData[0].blockHash
      const block8200Rlp = testBlockData[0].rlp
      const headerKey = getHistoryNetworkContentId(1, 0, block8200Hash)
      const blockKey = getHistoryNetworkContentId(1, 1, block8200Hash)
      const testBlock = Block.fromRLPSerializedBlock(Buffer.from(fromHexString(block8200Rlp)), {
        hardforkByBlockNumber: true,
      })
      const block8200Body = sszEncodeBlockBody(testBlock)
      const block8200Header = testBlock.header.serialize()
      portal1.db.put(headerKey, toHexString(block8200Header))
      portal1.db.put(blockKey, toHexString(block8200Body))
      await protocol2.addContentToHistory(
        1,
        HistoryNetworkContentTypes.HeaderAccumulator,
        toHexString(accumulatorKey),
        fromHexString(testAccumulator)
      )
      let header: Uint8Array
      portal2.on('ContentAdded', async (blockHash, contentType, content) => {
        if (contentType === HistoryNetworkContentTypes.BlockHeader) {
          st.equal(content, toHexString(block8200Header))
          header = fromHexString(content)
        }
        if (contentType === HistoryNetworkContentTypes.BlockBody) {
          const block = reassembleBlock(header, fromHexString(content))
          st.equal(
            toHexString(block.serialize()),
            block8200Rlp,
            'eth_getBlockByNumber test passed.'
          )
          end(child, [portal1, portal2], st)
        }
      })

      await protocol1.sendPing(portal2.discv5.enr)
      await protocol2.getBlockByNumber(8200, true)
    }
    connectAndTest(t, st, findAccumulator, true)
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
          chainId: 1,
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
          1,
          HistoryNetworkContentTypes.HeaderAccumulator,
          toHexString(accumulatorKey),
          fromHexString(accumulatorData)
        )
        await protocol1.addContentToHistory(
          1,
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
            const contentId = getHistoryNetworkContentId(1, 3, blockHash)
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
  t.test('eth_getBlockByNumber -- HistoricalEpoch', (st) => {
    const accumulatorData = require('./testAccumulator.json')
    const epochData = require('./testEpoch.json')
    const block1000 = require('./testBlock1000.json')
    const epochHash = epochData.hash
    const serialized = epochData.serialized
    const epochKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 3,
      value: {
        chainId: 1,
        blockHash: fromHexString(epochHash),
      },
    })
    const blockRlp = block1000.raw
    const rebuiltBlock = Block.fromRLPSerializedBlock(Buffer.from(fromHexString(blockRlp)), {
      hardforkByBlockNumber: true,
    })
    const body = sszEncodeBlockBody(rebuiltBlock)
    const _header = rebuiltBlock.header.serialize()
    const blockHash = block1000.hash

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
        1,
        HistoryNetworkContentTypes.HeaderAccumulator,
        toHexString(accumulatorKey),
        fromHexString(accumulatorData)
      )
      await protocol1.addContentToHistory(
        1,
        HistoryNetworkContentTypes.EpochAccumulator,
        toHexString(epochKey),
        fromHexString(serialized)
      )
      await protocol1.addContentToHistory(
        1,
        HistoryNetworkContentTypes.BlockHeader,
        blockHash,
        _header
      )
      await protocol1.addContentToHistory(1, HistoryNetworkContentTypes.BlockBody, blockHash, body)
      let header: Uint8Array
      portal2.on('ContentAdded', async (blockHash, contentType, content) => {
        if (contentType === HistoryNetworkContentTypes.HeaderAccumulator) {
          const headerAccumulator = HeaderAccumulatorType.deserialize(fromHexString(content))
          const _epochHash = toHexString(headerAccumulator.historicalEpochs[0])
          st.equal(
            _epochHash,
            epochHash,
            'Received Accumulator has historical epoch hash for blocks 0 - 8191.'
          )
          protocol2.getBlockByNumber(1000, true)
        }
        if (contentType === HistoryNetworkContentTypes.BlockHeader) {
          st.equal(
            contentType,
            HistoryNetworkContentTypes.BlockHeader,
            'eth_getBlockByNumber returned a block header'
          )
          header = fromHexString(content)
        }
        if (contentType === HistoryNetworkContentTypes.BlockBody) {
          st.equal(
            contentType,
            HistoryNetworkContentTypes.BlockBody,
            'eth_getBlockByNumber returned a block body'
          )
          const body = fromHexString(content)
          const block = reassembleBlock(header, body)
          st.equal(block.header.number, 1000n, 'eth_getBlockByNumber returned block 1000')
          st.deepEqual(
            block.header,
            rebuiltBlock.header,
            'eth_getBlockByNumber retrieved block 1000'
          )
          st.deepEqual(
            block.serialize(),
            rebuiltBlock.serialize(),
            'eth_getBlockByNumber retrieved block 1000'
          )
          st.pass('eth_getBlockByNumber test passed')
          end(child, [portal1, portal2], st)
        }
      })

      await protocol1.sendPing(portal2.discv5.enr)
      await protocol2.sendFindContent(portal1.discv5.enr.nodeId, accumulatorKey)
    }
    connectAndTest(t, st, findEpoch, true)
  })
})
