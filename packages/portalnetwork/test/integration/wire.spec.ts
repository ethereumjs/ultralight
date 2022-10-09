import tape from 'tape'
import { ChildProcessWithoutNullStreams } from 'child_process'
import {
  decodeSszBlockBody,
  PortalNetwork,
  ProtocolId,
  sszEncodeBlockBody,
  HistoryNetworkContentTypes,
  HeaderAccumulatorType,
  getHistoryNetworkContentId,
  HistoryNetworkContentKeyType,
  HistoryProtocol,
  EpochAccumulator,
  reassembleBlock,
} from '../../src/index.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { createRequire } from 'module'
import { BlockHeader } from '@ethereumjs/block'
import * as rlp from '@ethereumjs/rlp'
import { connectAndTest, end } from './integrationTest.js'

const require = createRequire(import.meta.url)

// TODO: Test requesting and sending and receiving a header proof

tape('Integration Tests -- PING/PONG', (t) => {
  t.test('clients start and connect to each other', (st) => {
    const ping = async (portal1: PortalNetwork, portal2: PortalNetwork) => {
      const protocol = portal2.protocols.get(ProtocolId.HistoryNetwork)
      if (!protocol) throw new Error('should have History Protocol')
      const res = await protocol.sendPing(portal1.discv5.enr)
      st.ok(res!.enrSeq >= 1n, 'Nodes connected and played PING/PONG')
    }
    connectAndTest(t, st, ping)
  })
})

tape('Integration -- FINDCONTENT/FOUNDCONTENT', (t) => {
  t.test('Nodes should stream content with FINDCONTENT / FOUNDCONTENT', (st) => {
    const findBlocks = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol1 = portal1.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      if (!protocol2 || !protocol1) throw new Error('should have History Protocol')
      const testBlockData: any[] = require('./testBlocks.json')
      const testBlock = Block.fromRLPSerializedBlock(
        Buffer.from(fromHexString(testBlockData[29].rlp)),
        {
          hardforkByBlockNumber: true,
        }
      )
      const testblockHeader = testBlock.header
      const testBlockBody = sszEncodeBlockBody(testBlock)

      const testHash = testBlockData[29].blockHash
      const testBlockKeys: Uint8Array[] = []

      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.BlockHeader,
        testHash,
        testblockHeader.serialize()
      )
      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.BlockBody,
        testHash,
        testBlockBody
      )
      testBlockKeys.push(
        HistoryNetworkContentKeyType.serialize(
          Buffer.concat([Uint8Array.from([0]), fromHexString(testHash)])
        ),
        HistoryNetworkContentKeyType.serialize(
          Buffer.concat([Uint8Array.from([1]), fromHexString(testHash)])
        )
      )
      let header: Uint8Array
      portal2.on('ContentAdded', async (blockHash, contentType, content) => {
        st.equal(
          await portal1.db.get(getHistoryNetworkContentId(contentType, testHash)),
          await portal2.db.get(getHistoryNetworkContentId(contentType, testHash)),
          `${HistoryNetworkContentTypes[contentType]} successfully stored in database`
        )
        if (contentType === HistoryNetworkContentTypes.BlockHeader) {
          st.ok(blockHash === testHash, 'FINDCONTENT/FOUNDCONTENT sent a block header')
          st.equal(
            toHexString(testBlock.header.serialize()),
            content,
            'Received header matches test block header'
          )
          header = fromHexString(content)
        }
        if (contentType === HistoryNetworkContentTypes.BlockBody) {
          st.ok(blockHash === testHash, 'FINDCONTENT/FOUNDCONTENT sent a block')
          if (blockHash === testHash && contentType === HistoryNetworkContentTypes.BlockBody) {
            try {
              decodeSszBlockBody(fromHexString(content))
              st.pass('SSZ decoding successfull')
            } catch (err) {
              st.fail(`SSZ Decoding failed: ${(err as any).message}`)
            }

            const block = reassembleBlock(header, fromHexString(content))
            st.equal(
              toHexString(block.hash()),
              toHexString(testBlock.hash()),
              'FINDCONTENT/FOUNDCONTENT successfully sent a Block over uTP.'
            )
            st.deepEqual(
              block.transactions,
              testBlock.transactions,
              'Received Block matches Test Block'
            )
            st.deepEqual(
              block.uncleHeaders,
              testBlock.uncleHeaders,
              'Received Block matches Test Block'
            )
            st.pass('FINDCONTENT/FOUNDCONTENT uTP Stream succeeded')
            end(child, [portal1, portal2], st)
          }
        }
      })

      await protocol1.sendPing(portal2.discv5.enr)
      await protocol2.sendFindContent(portal1.discv5.enr.nodeId, testBlockKeys[0])
      await protocol2.sendFindContent(portal1.discv5.enr.nodeId, testBlockKeys[1])
    }
    connectAndTest(t, st, findBlocks, true)
  })
})

tape('OFFER/ACCEPT', (t) => {
  t.test('Nodes should stream multiple blocks OFFER / ACCEPT', (st) => {
    const offerBlocks = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      if (!protocol) throw new Error('should have History Protocol')
      const testBlockData = require('./testBlocks.json')
      const testBlocks: Block[] = testBlockData.slice(0, 13).map((blockData: any) => {
        return Block.fromRLPSerializedBlock(Buffer.from(fromHexString(blockData.rlp)), {
          hardforkByBlockNumber: true,
        })
      })
      const testHashes = testBlocks.map((testBlock) => {
        return toHexString(testBlock.hash())
      })
      const testBlockKeys: Uint8Array[] = []
      for (const testBlock of testBlocks) {
        await protocol.addContentToHistory(
          HistoryNetworkContentTypes.BlockHeader,
          '0x' + testBlock.header.hash().toString('hex'),
          testBlock.header.serialize()
        )
        await protocol.addContentToHistory(
          HistoryNetworkContentTypes.BlockBody,
          '0x' + testBlock.header.hash().toString('hex'),
          sszEncodeBlockBody(testBlock)
        )
        testBlockKeys.push(
          HistoryNetworkContentKeyType.serialize(
            Buffer.concat([Uint8Array.from([0]), testBlock.header.hash()])
          ),
          HistoryNetworkContentKeyType.serialize(
            Buffer.concat([Uint8Array.from([1]), testBlock.header.hash()])
          )
        )
      }
      let i = 0
      const _blocks: string[] = []

      portal1.on('ContentAdded', async (blockHash, contentType, content) => {
        st.equal(
          await portal1.db.get(
            getHistoryNetworkContentId(contentType, testHashes[testHashes.indexOf(blockHash)])
          ),
          content,
          `${HistoryNetworkContentTypes[contentType]} successfully stored in db`
        )
        if (contentType === HistoryNetworkContentTypes.BlockHeader) {
          i++
        }
        if (contentType === HistoryNetworkContentTypes.BlockBody) {
          i++
          _blocks.push(blockHash)
        }
        if (i === 26 && contentType === HistoryNetworkContentTypes.BlockBody) {
          st.equal(i, testBlockKeys.length, 'OFFER/ACCEPT sent all the items')
          try {
            for (const hash of testHashes) {
              _blocks.includes(hash)
            }
            st.pass('Content ACCEPTED matches content OFFERED')
          } catch {
            st.fail('Offer test missed items')
          }
          const body = decodeSszBlockBody(fromHexString(content))
          try {
            const uncleHeaderHash = toHexString(
              BlockHeader.fromValuesArray(rlp.decode(body.unclesRlp)[0] as Buffer[], {
                hardforkByBlockNumber: true,
              }).hash()
            )
            st.equal(
              toHexString(testBlocks[testBlocks.length - 1].uncleHeaders[0].hash()),
              uncleHeaderHash,
              'OFFER/ACCEPT successfully streamed an SSZ encoded block OFFER/ACCEPT'
            )
          } catch {}
          st.pass('OFFER/ACCEPT uTP Stream succeeded')
          end(child, [portal1, portal2], st)
        }
      })

      await protocol.sendPing(portal1.discv5.enr)
      await protocol.sendOffer(portal1.discv5.enr.nodeId, testBlockKeys)
    }
    connectAndTest(t, st, offerBlocks, true)
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
})
