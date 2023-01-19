import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { ChildProcessWithoutNullStreams } from 'child_process'
import { createRequire } from 'module'
import tape from 'tape'
import {
  decodeSszBlockBody,
  getHistoryNetworkContentKey,
  HistoryNetworkContentKeyType,
  HistoryNetworkContentTypes,
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  reassembleBlock,
  sszEncodeBlockBody,
} from 'portalnetwork'
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
  t.test('client should ignore unresponsive peer after PING/PONG failure', (st) => {
    const ignore = async (portal1: PortalNetwork, portal2: PortalNetwork) => {
      const protocol2 = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      const enr1 = portal1.discv5.enr
      const nodeId1 = enr1.nodeId
      let res = await protocol2.sendPing(enr1)
      st.notEqual(res, undefined, 'Nodes connected and played PING/PONG')
      await portal1.stop()
      res = await protocol2.sendPing(enr1)
      st.equals(res, undefined, 'sendPing with no response returned undefined')
      st.equals(
        protocol2.routingTable.isIgnored(nodeId1),
        true,
        'Node added to ignore list after failed PING/PONG attempt'
      )
    }
    connectAndTest(t, st, ignore)
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
        fromHexString(
          getHistoryNetworkContentKey(
            HistoryNetworkContentTypes.BlockHeader,
            fromHexString(testHash)
          )
        ),
        fromHexString(
          getHistoryNetworkContentKey(HistoryNetworkContentTypes.BlockBody, fromHexString(testHash))
        )
      )
      let header: Uint8Array
      portal2.on('ContentAdded', async (blockHash, contentType, content) => {
        st.equal(
          await portal1.db.get(getHistoryNetworkContentKey(contentType, fromHexString(testHash))),
          await portal2.db.get(getHistoryNetworkContentKey(contentType, fromHexString(testHash))),
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
            Buffer.concat([
              Uint8Array.from([HistoryNetworkContentTypes.BlockHeader]),
              testBlock.header.hash(),
            ])
          ),
          HistoryNetworkContentKeyType.serialize(
            Buffer.concat([
              Uint8Array.from([HistoryNetworkContentTypes.BlockBody]),
              testBlock.header.hash(),
            ])
          )
        )
      }
      const _blocks: string[] = []
      const _headers: string[] = []

      portal1.on('ContentAdded', async (blockHash, contentType) => {
        if (contentType === 0) {
          _headers.push(blockHash)
        }
        if (contentType === 1) {
          _blocks.push(blockHash)
        }
        if (_headers.length === 13 && _blocks.length === 13) {
          st.equal(_headers.length, 13, 'OFFER/ACCEPT sent all the headers')
          st.equal(_blocks.length, 13, 'OFFER/ACCEPT sent all the blocks')
          st.equal(
            testHashes.every((hash) => _blocks.includes(hash)),
            true,
            'offer sent all the blocks'
          )
          try {
            const body = await portal1.protocols
              .get(ProtocolId.HistoryNetwork)!
              .findContentLocally(
                fromHexString(
                  getHistoryNetworkContentKey(
                    HistoryNetworkContentTypes.BlockBody,
                    fromHexString(_blocks[12])
                  )
                )
              )
            const header = await portal1.protocols
              .get(ProtocolId.HistoryNetwork)!
              .findContentLocally(
                fromHexString(
                  getHistoryNetworkContentKey(
                    HistoryNetworkContentTypes.BlockHeader,
                    fromHexString(_blocks[12])
                  )
                )
              )
            const block = reassembleBlock(header!, body)
            st.equal(
              toHexString(block.serialize()),
              toHexString(testBlocks[12].serialize()),
              'OFFER/ACCEPT successfully streamed an SSZ encoded block OFFER/ACCEPT'
            )
            st.pass('OFFER/ACCEPT uTP Stream succeeded')
            end(child, [portal1, portal2], st)
          } catch (err) {
            st.fail('offer accept test failed ' + err)
            end(child, [portal1, portal2], st)
          }
        }
      })

      await protocol.sendPing(portal1.discv5.enr)
      await protocol.sendOffer(portal1.discv5.enr.nodeId, testBlockKeys)
    }
    connectAndTest(t, st, offerBlocks, true)
  })
})
