import tape from 'tape'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import PeerId from 'peer-id'
import { ENR, EntryStatus } from '@chainsafe/discv5'
import { Multiaddr } from 'multiaddr'
import { PortalNetwork, SubNetworkIds } from '../../src'
import { HistoryNetworkContentTypes } from '../../src/historySubnetwork/types'
import { fromHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from '../../src/historySubnetwork'
import { Block } from '@ethereumjs/block'

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
  const id1 = await PeerId.create({ keyType: 'secp256k1' })
  const enr1 = ENR.createFromPeerId(id1)
  enr1.setLocationMultiaddr(new Multiaddr('/ip4/127.0.0.1/udp/0'))
  const id2 = await PeerId.create({ keyType: 'secp256k1' })
  const enr2 = ENR.createFromPeerId(id2)
  enr2.setLocationMultiaddr(new Multiaddr('/ip4/127.0.0.1/udp/0'))
  const portal1 = await PortalNetwork.createPortalNetwork('127.0.0.1', 'ws://127.0.0.1:5050')
  const portal2 = await PortalNetwork.createPortalNetwork('127.0.0.1', 'ws://127.0.0.1:5050')
  return [portal1, portal2]
}

tape('Portal Wire Spec Testing', async (t) => {
  t.test('clients should start and connect', { timeout: 10000 }, (st) => {
    const file = require.resolve('../../../proxy/dist/index.js')
    const child = spawn(process.execPath, [file])
    let portal1: PortalNetwork
    let portal2: PortalNetwork

    child.stderr.on('data', async (data) => {
      if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
        st.pass('proxy started successfully')
        const nodes = await setupNetwork()
        portal1 = nodes[0]
        portal2 = nodes[1]
        portal1.enableLog()
        portal2.enableLog()
        portal1.client.once('multiaddrUpdated', () => portal2.start())
        portal2.client.once('multiaddrUpdated', async () => {
          let done = false
          while (!done) {
            const res = await portal2.sendPing(portal1.client.enr, SubNetworkIds.HistoryNetwork)
            if (res && res.enrSeq === 5n) {
              st.pass('Nodes connected and played PING/PONG')
              await end(child, [portal1, portal2], st)
              done = true
              break
            }
          }
        })
        portal1.start()
      }
    })
  })

  t.test('node should stream block to another', { timeout: 10000 }, (st) => {
    const file = require.resolve('../../../proxy/dist/index.js')
    const child = spawn(process.execPath, [file])
    let portal1: PortalNetwork
    let portal2: PortalNetwork
    //   tape.onFailure(() => end(child, [portal1, portal2], st))

    child.stderr.on('data', async (data) => {
      if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
        const nodes = await setupNetwork()
        portal1 = nodes[0]
        portal2 = nodes[1]
        portal1.enableLog()
        portal2.enableLog()
        portal1.on('ContentAdded', (blockHash) => {
          if (blockHash === '0x8faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220') {
            st.pass('OFFER/ACCEPT/uTP Stream succeeded')
            end(child, [portal1, portal2], st)
          }
        })
        portal1.client.once('multiaddrUpdated', () => portal2.start())

        portal2.client.once('multiaddrUpdated', async () => {
          await portal2.sendPing(portal1.client.enr, SubNetworkIds.HistoryNetwork)
          const testBlock = Block.fromRLPSerializedBlock(
            Buffer.from(fromHexString(require('./testBlock.json').rlp))
          )
          await portal2.addContentToHistory(
            1,
            HistoryNetworkContentTypes.BlockHeader,
            '0x' + testBlock.header.hash().toString('hex'),
            testBlock.header.serialize()
          )
          await portal2.sendOffer(
            portal1.client.enr.nodeId,
            [
              HistoryNetworkContentKeyUnionType.serialize({
                selector: 0,
                value: { chainId: 1, blockHash: Uint8Array.from(testBlock.header.hash()) },
              }),
            ],
            SubNetworkIds.HistoryNetwork
          )
        })
        portal1.start()
      }
    })
  })
})
