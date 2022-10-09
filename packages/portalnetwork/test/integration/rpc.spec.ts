import tape from 'tape'
import { ChildProcessWithoutNullStreams } from 'child_process'
import {
  PortalNetwork,
  ProtocolId,
  sszEncodeBlockBody,
  getHistoryNetworkContentId,
  HistoryNetworkContentKeyType,
  HistoryProtocol,
  reassembleBlock,
  HistoryNetworkContentTypes,
  HeaderAccumulatorType,
  HeaderAccumulator,
} from '../../src/index.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { createRequire } from 'module'
import { connectAndTest, end } from './integrationTest.js'

const require = createRequire(import.meta.url)

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
      await protocol1.sendPing(portal2.discv5.enr)
      const returnedBlock = (await protocol2.ETH.getBlockByHash(
        testHashStrings[idx],
        true
      )) as Block
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
      await protocol1.addContentToHistory(0, testHash, testHeader)

      await protocol1.sendPing(portal2.discv5.enr)
      const returnedBlock = (await protocol2.ETH.getBlockByHash(testHash, true)) as Block
      st.deepEqual(
        returnedBlock.header.hash(),
        testBlock.header.hash(),
        'eth_getBlockByHash test passed'
      )
      const _h = await portal2.db.get(
        getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockHeader, testHash)
      )
      st.equal(_h, toHexString(testHeader), 'eth_getBlockByHash returned a Block Header')

      try {
        await portal2.db.get(
          getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockBody, testHash)
        )
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
  t.test('eth_getBlockByNumber', (st) => {
    const _accumulator = require('./testAccumulator.json')
    const accumulator = HeaderAccumulatorType.deserialize(fromHexString(_accumulator))

    const epochData = require('./testEpoch.json')
    const block1000 = require('./testBlock1000.json')
    const epochHash = epochData.hash
    const serialized = epochData.serialized
    const epochKey = HistoryNetworkContentKeyType.serialize(
      Buffer.concat([
        Uint8Array.from([HistoryNetworkContentTypes.EpochAccumulator]),
        fromHexString(epochHash),
      ])
    )
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
      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.EpochAccumulator,
        epochHash,
        fromHexString(serialized)
      )
      await protocol1.addContentToHistory(
        HistoryNetworkContentTypes.BlockHeader,
        blockHash,
        _header
      )
      await protocol1.addContentToHistory(HistoryNetworkContentTypes.BlockBody, blockHash, body)
      protocol1.accumulator.replaceAccumulator(
        new HeaderAccumulator({
          storedAccumulator: accumulator,
        })
      )
      protocol2.accumulator.replaceAccumulator(
        new HeaderAccumulator({
          storedAccumulator: accumulator,
        })
      )

      await protocol1.sendPing(portal2.discv5.enr)
      try {
        const returned = await protocol2.ETH.getBlockByNumber(1000, true)
        st.equal(returned!.header.number, 1000n, 'eth_getBlockByNumber returned block 1000')
        st.deepEqual(
          returned!.header,
          rebuiltBlock.header,
          'eth_getBlockByNumber retrieved block 1000'
        )
        st.deepEqual(
          returned!.serialize(),
          rebuiltBlock.serialize(),
          'eth_getBlockByNumber retrieved block 1000'
        )
        st.pass('eth_getBlockByNumber test passed')
      } catch (e) {
        st.fail(`eth_getBlockByNumber test failed: ${(e as any).message}`)
      }
      end(child, [portal1, portal2], st)
    }
    connectAndTest(t, st, findEpoch, true)
  })
})
