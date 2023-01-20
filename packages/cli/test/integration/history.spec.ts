import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { ChildProcessByStdio, ChildProcessWithoutNullStreams } from 'child_process'
import { createRequire } from 'module'
import tape from 'tape'
import {
  getHistoryNetworkContentKey,
  HistoryNetworkContentTypes,
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  sszEncodeBlockBody,
} from 'portalnetwork'
import { connectAndTest, end } from './integrationTest.js'
import jayson from 'jayson/promise/index.js'

const require = createRequire(import.meta.url)

const nodes = {
  node1: {
    nodeId: 'f7c205cc868edd8519c2873ab4252b06842723b33d77acafe92271179aff02c8',
    enr: 'enr:-IS4QCndV76oLLohd9CA0vRiX5b3_fGqExViBL4zvBbWcFOQXm-AwWhJkxN05hit9pDVGPDAkwn8qxMGYiXd-mJYo6EDgmlkgnY0gmlwhMCoVh2Jc2VjcDI1NmsxoQInMJdnOilIr5MxcjXS8CrZzzt5o07rN3IMXxngnxF4PIN1ZHCCIWE',
  },
  node2: {
    nodeId: '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
    enr: 'enr:-IS4QHgO8pX1b5I3z4tvMBpmqivXj3hKzcKSYiKH7cbqFcH1B5Yaofybqf175qt1I6Gxl8FzMTsf5aQOGjJ1p6mrEkEDgmlkgnY0gmlwhMCoVh2Jc2VjcDI1NmsxoQOZCain6B29yGdIDw7rdGgYnR56HdfuihPuSGyMvXQ3ZIN1ZHCCIWI',
  },
}

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

async function readyTest(
  p1: ChildProcessWithoutNullStreams,
  p2: ChildProcessWithoutNullStreams,
  st: tape.Test,
  continue1: () => Promise<void>,
  listeners: ((msg: string) => Promise<void>)[] = []
) {
  let ready = false
  p1.stderr.on('data', (data) => {
    const msg = data.toString().split(' ').slice(1).join(' ')
    if (msg.trim().includes('Started JSON RPC')) {
      st.pass('p1 ready')
      if (ready) {
        st.pass('test ready')
        continue1()
      } else {
        ready = true
      }
    }
  })
  p2.stderr.on('data', async (data: Buffer) => {
    const msg = data.toString().split(' ').slice(1).join(' ')
    if (msg.trim().includes('Started JSON RPC')) {
      console.log('LISTEN')
      st.pass('p2 ready')
      if (ready) {
        st.pass('test ready')
        continue1()
      } else {
        ready = true
      }
    }
    for (const listener of listeners) {
      await listener(msg)
    }
  })
}

tape('History Protocol Integration Tests', (t) => {
  t.test('Node should gossip new content to peer', (st) => {
    const gossip = async (
      portal1: jayson.Client,
      portal2: jayson.Client,
      p1: ChildProcessWithoutNullStreams,
      p2: ChildProcessWithoutNullStreams
    ) => {
      const continue1 = async () => {
        const node1Info = await portal1.request('discv5_nodeInfo', [])
        st.equal(node1Info.result.enr, nodes.node1.enr, 'Node 1 started from private key')
        const node2Info = await portal2.request('discv5_nodeInfo', [])
        st.equal(node2Info.result.enr, nodes.node2.enr, 'Node 2 started from private key')
        const ping1 = await portal1.request('portal_historyPing', [nodes.node2.enr])
        st.equal(
          ping1.result,
          `PING/PONG successful with ${nodes.node2.nodeId}`,
          'Node 1 pinged Node 2'
        )
        const ping2 = await portal2.request('portal_historyPing', [nodes.node1.enr])
        st.equal(
          ping2.result,
          `PING/PONG successful with ${nodes.node1.nodeId}`,
          'Node 2 pinged Node 1'
        )

        for await (const [idx, testBlock] of testBlocks.entries()) {
          await portal1.request('ultralight_addBlockToHistory', [
            testHashStrings[idx],
            toHexString(testBlock.serialize()),
          ])
        }
      }

      const continue2 = async () => {
        p1.kill('SIGINT')
        const ping2 = await portal2.request('portal_historyPing', [nodes.node1.enr])
        st.equal(
          ping2.result,
          `PING/PONG with ${nodes.node1.nodeId} was unsuccessful`,
          'Node unreachable after shutdown'
        )
        end([p1, p2], st)
      }
      let received = 0
      await readyTest(p1, p2, st, continue1, [
        async (msg) => {
          if (msg.trim().includes('added for block')) {
            if (received === 51) {
              st.pass('Gossip test passed -- 26 blocks gossiped ')
              await continue2()
            } else {
              received += 1
              received % 2 === 0 &&
                st.pass(`received block ${received / 2} of ${testBlocks.length}`)
            }
          }
        },
      ])
    }
    connectAndTest(t, st, gossip, true)
  })
  t.test('Node should retrieve content via FINDCONTENT ', (st) => {
    const gossip = async (
      portal1: jayson.Client,
      portal2: jayson.Client,
      p1: ChildProcessWithoutNullStreams,
      p2: ChildProcessWithoutNullStreams
    ) => {
      const continue1 = async () => {
        await portal1.request('portal_historyPing', [nodes.node2.enr])
        await portal2.request('portal_historyPing', [nodes.node1.enr])
        await portal1.request('ultralight_addBlockToHistory', [
          testBlockData[29].blockHash,
          testBlockData[29].rlp,
        ])
        const findContent = await portal2.request('portal_historyFindContent', [
          nodes.node1.nodeId,
          getHistoryNetworkContentKey(
            HistoryNetworkContentTypes.BlockHeader,
            fromHexString(testBlockData[29].blockHash)
          ),
        ])
        st.equal(findContent.result.selector, 1, 'Node 2 found content from Node 1')
        end([p1, p2], st)
      }

      let ready = false
      p1.stderr.on('data', (data) => {
        const msg = data.toString().split(' ').slice(1).join(' ')
        if (msg.trim().includes('Started JSON RPC')) {
          st.pass('p1 ready')
          if (ready) {
            st.pass('test ready')
            continue1()
          } else {
            ready = true
          }
        }
      })
      p2.stderr.on('data', (data: Buffer) => {
        const msg = data.toString().split(' ').slice(1).join(' ')
        if (msg.trim().includes('Started JSON RPC')) {
          console.log('LISTEN')
          st.pass('p2 ready')
          if (ready) {
            st.pass('test ready')
            continue1()
          } else {
            ready = true
          }
        }
        if (msg.trim().includes('added for block')) {
          st.pass(`received block`)
        }
      })
    }
    connectAndTest(t, st, gossip, true)
  })
  t.test('Node should retrieve content via eth_getBlockByHash ', (st) => {
    const gossip = async (
      portal1: jayson.Client,
      portal2: jayson.Client,
      p1: ChildProcessWithoutNullStreams,
      p2: ChildProcessWithoutNullStreams
    ) => {
      const continue1 = async () => {
        await portal1.request('portal_historyPing', [nodes.node2.enr])
        await portal2.request('portal_historyPing', [nodes.node1.enr])
        await portal1.request('ultralight_addBlockToHistory', [
          testBlockData[29].blockHash,
          testBlockData[29].rlp,
        ])
        const getBlock = await portal2.request('eth_getBlockByHash', [
          testBlockData[29].blockHash,
          true,
        ])
        const expected = Block.fromRLPSerializedBlock(
          Buffer.from(fromHexString(testBlockData[29].rlp)),
          {
            hardforkByBlockNumber: true,
          }
        )
        st.deepEqual(
          getBlock.result,
          expected.toJSON(),
          'Node 2 found content with eth_getBlockByHash'
        )
        end([p1, p2], st)
      }
      await readyTest(p1, p2, st, continue1)
    }
    connectAndTest(t, st, gossip, true)
  })
  t.test('Node should retrieve content via eth_getBlockByNumber ', (st) => {
    const gossip = async (
      portal1: jayson.Client,
      portal2: jayson.Client,
      p1: ChildProcessWithoutNullStreams,
      p2: ChildProcessWithoutNullStreams
    ) => {
      const continue1 = async () => {
        const epochData = require('./testEpoch.json')
        const block1000 = require('./testBlock1000.json')
        const epochHash = epochData.hash
        const epoch = epochData.serialized

        const blockRlp = block1000.raw
        const expected = Block.fromRLPSerializedBlock(Buffer.from(fromHexString(blockRlp)), {
          hardforkByBlockNumber: true,
        })
        const blockHash = block1000.hash

        await portal1.request('portal_historyPing', [nodes.node2.enr])
        await portal2.request('portal_historyPing', [nodes.node1.enr])
        await portal1.request('ultralight_addBlockToHistory', [blockHash, blockRlp])
        await portal1.request('ultralight_addContentToDB', [
          getHistoryNetworkContentKey(
            HistoryNetworkContentTypes.EpochAccumulator,
            fromHexString(epochHash)
          ),
          epoch,
        ])
        const getBlock = await portal2.request('eth_getBlockByNumber', ['0x3e8', true])
        st.deepEqual(
          getBlock.result,
          expected.toJSON(),
          'Node 2 found content with eth_getBlockByNumber'
        )
        end([p1, p2], st)
      }

      await readyTest(p1, p2, st, continue1, [
        async (msg: string) => {
          if (msg.includes('added EpochAccumulator')) {
            st.pass('EpochAccumulator acquired during eth_getBlockByNumber')
          }
        },
      ])
    }
    connectAndTest(t, st, gossip, true)
  })
  t.end()
})
