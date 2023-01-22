import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { ChildProcessWithoutNullStreams } from 'child_process'
import { createRequire } from 'module'
import tape from 'tape'
import { getHistoryNetworkContentKey, HistoryNetworkContentTypes } from 'portalnetwork'
import { connectAndTest, end } from './integrationTest.js'
import jayson from 'jayson/promise/index.js'

const require = createRequire(import.meta.url)

const nodes = {
  node1: {
    nodeId: '0xf7c205cc868edd8519c2873ab4252b06842723b33d77acafe92271179aff02c8',
  },
  node2: {
    nodeId: '0x8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
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

tape('Gossip Test', (t) => {
  t.test('Node should gossip new content to peer', (st) => {
    const gossip = async (
      portal1: jayson.Client,
      portal2: jayson.Client,
      p1: ChildProcessWithoutNullStreams,
      p2: ChildProcessWithoutNullStreams
    ) => {
      let nodes1enr: string
      let nodes2enr: string
      const continue1 = async () => {
        const node1Info = await portal1.request('discv5_nodeInfo', [])
        st.equal(node1Info.result.nodeId, nodes.node1.nodeId, 'Node 1 started from private key')
        nodes1enr = node1Info.result.enr
        const node2Info = await portal2.request('discv5_nodeInfo', [])
        st.equal(node2Info.result.nodeId, nodes.node2.nodeId, 'Node 2 started from private key')
        nodes2enr = node2Info.result.enr
        const ping1 = await portal1.request('portal_historyPing', [nodes2enr])
        st.equal(
          ping1.result,
          `PING/PONG successful with ${nodes.node2.nodeId.slice(2)}`,
          'Node 1 pinged Node 2'
        )
        const ping2 = await portal2.request('portal_historyPing', [nodes1enr])
        st.equal(
          ping2.result,
          `PING/PONG successful with ${nodes.node1.nodeId.slice(2)}`,
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
        const ping2 = await portal2.request('portal_historyPing', [nodes1enr])
        st.equal(
          ping2.result,
          `PING/PONG with ${nodes.node1.nodeId.slice(2)} was unsuccessful`,
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
  t.end()
})
tape('FindContent Test', (t) => {
  t.test('Node should retrieve content via FINDCONTENT ', (st) => {
    const gossip = async (
      portal1: jayson.Client,
      portal2: jayson.Client,
      p1: ChildProcessWithoutNullStreams,
      p2: ChildProcessWithoutNullStreams
    ) => {
      let nodes1enr: string
      let nodes2enr: string
      const continue1 = async () => {
        const node1Info = await portal1.request('discv5_nodeInfo', [])
        st.equal(node1Info.result.nodeId, nodes.node1.nodeId, 'Node 1 started from private key')
        nodes1enr = node1Info.result.enr
        const node2Info = await portal2.request('discv5_nodeInfo', [])
        st.equal(node2Info.result.nodeId, nodes.node2.nodeId, 'Node 2 started from private key')
        nodes2enr = node2Info.result.enr
        await portal1.request('portal_historyPing', [nodes2enr])
        await portal2.request('portal_historyPing', [nodes1enr])
        await portal1.request('ultralight_addBlockToHistory', [
          testBlockData[29].blockHash,
          testBlockData[29].rlp,
        ])
        const findContent = await portal2.request('portal_historyFindContent', [
          nodes.node1.nodeId.slice(2),
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
  t.end()
})
tape('Eth_GetBlockByHash Test', (t) => {
  t.test('Node should retrieve content via eth_getBlockByHash ', (st) => {
    const gossip = async (
      portal1: jayson.Client,
      portal2: jayson.Client,
      p1: ChildProcessWithoutNullStreams,
      p2: ChildProcessWithoutNullStreams
    ) => {
      let nodes1enr: string
      let nodes2enr: string
      const continue1 = async () => {
        const node1Info = await portal1.request('discv5_nodeInfo', [])
        st.equal(node1Info.result.nodeId, nodes.node1.nodeId, 'Node 1 started from private key')
        nodes1enr = node1Info.result.enr
        const node2Info = await portal2.request('discv5_nodeInfo', [])
        st.equal(node2Info.result.nodeId, nodes.node2.nodeId, 'Node 2 started from private key')
        nodes2enr = node2Info.result.enr
        await portal1.request('portal_historyPing', [nodes2enr])
        await portal2.request('portal_historyPing', [nodes1enr])
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
  t.end()
})
tape('Eth_GetBlockByNumber', (t) => {
  t.test('Node should retrieve content via eth_getBlockByNumber ', (st) => {
    const gossip = async (
      portal1: jayson.Client,
      portal2: jayson.Client,
      p1: ChildProcessWithoutNullStreams,
      p2: ChildProcessWithoutNullStreams
    ) => {
      let nodes1enr: string
      let nodes2enr: string
      const continue1 = async () => {
        const node1Info = await portal1.request('discv5_nodeInfo', [])
        st.equal(node1Info.result.nodeId, nodes.node1.nodeId, 'Node 1 started from private key')
        nodes1enr = node1Info.result.enr
        const node2Info = await portal2.request('discv5_nodeInfo', [])
        st.equal(node2Info.result.nodeId, nodes.node2.nodeId, 'Node 2 started from private key')
        nodes2enr = node2Info.result.enr
        const epochData = require('./testEpoch.json')
        const block1000 = require('./testBlock1000.json')
        const epochHash = epochData.hash
        const epoch = epochData.serialized

        const blockRlp = block1000.raw
        const expected = Block.fromRLPSerializedBlock(Buffer.from(fromHexString(blockRlp)), {
          hardforkByBlockNumber: true,
        })
        const blockHash = block1000.hash

        await portal1.request('portal_historyPing', [nodes2enr])
        await portal2.request('portal_historyPing', [nodes1enr])
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
