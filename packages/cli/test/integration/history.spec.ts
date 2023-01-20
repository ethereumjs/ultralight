import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { ChildProcessByStdio, ChildProcessWithoutNullStreams } from 'child_process'
import { createRequire } from 'module'
import tape from 'tape'
import {
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
        for await (const [idx, testBlock] of testBlocks.slice(0, 13).entries()) {
          const req = await portal1.request('ultralight_addBlockToHistory', [
            testHashStrings[idx],
            toHexString(testBlock.serialize()),
          ])
          console.log(req.result)
        }

        // end([p1, p2], st)
      }

      let ready = 0
      let received = 0
      p1.stderr.on('data', (data) => {
        const msg = data.toString().split(' ').slice(2).join(' ')
        if (msg.trim().startsWith('Started JSON RPC')) {
          st.pass('p1 ready')
          if (ready === 1) {
            st.pass('test passed')
            ready += 1
            continue1()
            // end([p1, p2], st)
          } else {
            ready += 1
          }
        }
        console.log('p1', `${msg}`)
      })
      p2.stderr.on('data', (data: Buffer) => {
        const msg = data.toString().split(' ').slice(2).join(' ')
        if (msg.trim().startsWith('Started JSON RPC')) {
          console.log('LISTEN')
          st.pass('p2 ready')
          if (ready === 1) {
            st.pass('test passed')
            ready += 1
            continue1()
            // end([p1, p2], st)
          } else {
            ready += 1
          }
        }
        if (msg.trim().startsWith('added BlockBody')) {
          received += 1
          if (received === 13) {
            st.pass('Gossip test passed -- 13 blocks gossiped ')
            end([p1, p2], st)
          }
        }
        console.log('p2', `${msg}`)
      })
    }
    connectAndTest(t, st, gossip, true)
  })
  t.end()
})
