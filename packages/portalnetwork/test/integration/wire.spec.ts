import tape from 'tape'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { Multiaddr } from '@multiformats/multiaddr'
import {
  decodeSszBlockBody,
  PortalNetwork,
  ProtocolId,
  sszEncodeBlockBody,
} from '../../src/index.js'
import { HistoryNetworkContentTypes } from '../../src/subprotocols/history/types.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import {
  getHistoryNetworkContentId,
  HistoryNetworkContentKeyUnionType,
} from '../../src/subprotocols/history/index.js'
import { Block } from '@ethereumjs/block'
import { TransportLayer } from '../../src/client/types.js'
import { HistoryProtocol } from '../../src/subprotocols/history/history.js'
import { createRequire } from 'module'
import { BlockHeader } from '@ethereumjs/block'
import * as rlp from 'rlp'

const require = createRequire(import.meta.url)

const end = async (
  child: ChildProcessWithoutNullStreams,
  nodes: PortalNetwork[],
  st: tape.Test
) => {
  child.stdout.removeAllListeners()
  child.kill('SIGINT')
  nodes.forEach(async (node) => await node.stop())
  st.end()
}

const setupNetwork = async () => {
  const portal1 = await PortalNetwork.create({
    bindAddress: '127.0.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.UTPNetwork],
    //@ts-ignore
    config: {
      config: {
        enrUpdate: true,
        addrVotesToUpdateEnr: 1,
      },
    },
  })
  const portal2 = await PortalNetwork.create({
    bindAddress: '127.0.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.UTPNetwork],
    //@ts-ignore
    config: {
      config: {
        enrUpdate: true,
        addrVotesToUpdateEnr: 1,
      },
    },
  })
  return [portal1, portal2]
}

function connectAndTest(
  t: tape.Test,
  st: tape.Test,
  testFunction: (
    portal1: PortalNetwork,
    portal2: PortalNetwork,
    child: ChildProcessWithoutNullStreams
  ) => Promise<void>,
  ends?: boolean
) {
  const file = require.resolve('../../../proxy/dist/index.js')
  const child = spawn(process.execPath, [file])
  let portal1: PortalNetwork
  let portal2: PortalNetwork
  child.stderr.on('data', async (data) => {
    if (data.toString().includes('Error: listen EADDRINUSE')) {
      // Terminate test process early if proxy can't start or tape will hang
      t.fail('proxy did not start successfully')
      process.exit(0)
    }

    if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
      const nodes = await setupNetwork()
      portal1 = nodes[0]
      portal2 = nodes[1]
      // portal1.enableLog('*Portal*,*discv5*')
      // portal2.enableLog('*Portal*,*discv5*')
      await portal1.start()
    } else if (data.toString().includes('UDP proxy listening on')) {
      const port = parseInt(data.toString().split('UDP proxy listening on  127.0.0.1')[1])
      if (!portal2.discv5.isStarted()) {
        portal1.discv5.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
        await portal2.start()
      } else if (portal2.discv5.isStarted()) {
        portal2.discv5.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
        await testFunction(portal1, portal2, child)
        if (!ends) {
          await end(child, [portal1, portal2], st)
        }
      }
    }
  })
}

tape('Portal Network Wire Spec Integration Tests', (t) => {
  t.test('clients start and connect to each other', (st) => {
    const ping = async (portal1: PortalNetwork, portal2: PortalNetwork) => {
      const protocol = portal2.protocols.get(ProtocolId.HistoryNetwork)
      if (!protocol) throw new Error('should have History Protocol')
      const res = await protocol.sendPing(portal1.discv5.enr)
      st.ok(res!.enrSeq >= 1n, 'Nodes connected and played PING/PONG')
    }
    connectAndTest(t, st, ping)
  })

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
        1,
        HistoryNetworkContentTypes.BlockHeader,
        testHash,
        testblockHeader.serialize()
      )
      await protocol1.addContentToHistory(
        1,
        HistoryNetworkContentTypes.BlockBody,
        testHash,
        testBlockBody
      )
      testBlockKeys.push(
        HistoryNetworkContentKeyUnionType.serialize({
          selector: HistoryNetworkContentTypes.BlockHeader,
          value: { chainId: 1, blockHash: fromHexString(testHash) },
        }),
        HistoryNetworkContentKeyUnionType.serialize({
          selector: HistoryNetworkContentTypes.BlockBody,
          value: { chainId: 1, blockHash: fromHexString(testHash) },
        })
      )
      let header: Uint8Array
      portal2.on('ContentAdded', async (blockHash, contentType, content) => {
        st.equal(
          await portal1.db.get(getHistoryNetworkContentId(1, contentType, testHash)),
          await portal2.db.get(getHistoryNetworkContentId(1, contentType, testHash)),
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

  t.test('Nodes should stream multiple pieces of content with OFFER / ACCEPT', (st) => {
    const offerBlocks = async (
      portal1: PortalNetwork,
      portal2: PortalNetwork,
      child: ChildProcessWithoutNullStreams
    ) => {
      const protocol = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      if (!protocol) throw new Error('should have History Protocol')
      const testBlockData = require('./testBlocks.json')
      const testBlocks: Block[] = testBlockData.map((blockData: any) => {
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
          1,
          HistoryNetworkContentTypes.BlockHeader,
          '0x' + testBlock.header.hash().toString('hex'),
          testBlock.header.serialize()
        )
        await protocol.addContentToHistory(
          1,
          HistoryNetworkContentTypes.BlockBody,
          '0x' + testBlock.header.hash().toString('hex'),
          sszEncodeBlockBody(testBlock)
        )
        testBlockKeys.push(
          HistoryNetworkContentKeyUnionType.serialize({
            selector: 0,
            value: { chainId: 1, blockHash: Uint8Array.from(testBlock.header.hash()) },
          }),
          HistoryNetworkContentKeyUnionType.serialize({
            selector: 1,
            value: { chainId: 1, blockHash: Uint8Array.from(testBlock.header.hash()) },
          })
        )
      }
      let i = 0
      const _blocks: string[] = []

      portal1.on('ContentAdded', async (blockHash, contentType, content) => {
        i++
        st.equal(
          await portal1.db.get(
            getHistoryNetworkContentId(1, contentType, testHashes[testHashes.indexOf(blockHash)])
          ),
          content,
          `${HistoryNetworkContentTypes[contentType]} successfully stored in db`
        )
        if (contentType === HistoryNetworkContentTypes.BlockBody) {
          _blocks.push(blockHash)
        }
        if (
          blockHash === testHashes[testHashes.length - 1] &&
          contentType === HistoryNetworkContentTypes.BlockBody
        ) {
          st.equal(i, testBlockKeys.length, 'OFFER/ACCEPT sent all the items')
          st.deepEqual(_blocks, testHashes, 'OFFER/ACCEPT sent the correct items')
          const body = decodeSszBlockBody(fromHexString(content))
          const uncleHeaderHash = toHexString(
            //@ts-ignore
            BlockHeader.fromValuesArray(rlp.decode(body.unclesRlp)[0], {
              hardforkByBlockNumber: true,
            }).hash()
          )
          st.equal(
            toHexString(testBlocks[testBlocks.length - 1].uncleHeaders[0].hash()),
            uncleHeaderHash,
            'OFFER/ACCEPT successfully streamed an SSZ encoded block OFFER/ACCEPT'
          )
          st.pass('OFFER/ACCEPT uTP Stream succeeded')
          end(child, [portal1, portal2], st)
        }
      })

      await protocol.sendPing(portal1.discv5.enr)
      await protocol.sendOffer(portal1.discv5.enr.nodeId, testBlockKeys)
    }
    connectAndTest(t, st, offerBlocks, true)
  })
})
