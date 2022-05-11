import tape from 'tape'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { Multiaddr } from 'multiaddr'
import { PortalNetwork, SubprotocolIds } from '../../src'
import { HistoryNetworkContentTypes } from '../../src/subprotocols/history/types'
import { fromHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from '../../src/subprotocols/history'
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
  const portal1 = await PortalNetwork.createPortalNetwork(
    'ws://127.0.0.1:5050',
    [],
    undefined,
    '127.0.0.1'
  )
  const portal2 = await PortalNetwork.createPortalNetwork(
    'ws://127.0.0.1:5050',
    [],
    undefined,
    '127.0.0.1'
  )
  return [portal1, portal2]
}

tape('Portal Network Wire Spec Integration Tests', (t) => {
  t.test('clients start and connect to each other', (st) => {
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
        portal1.enableLog('*portalnetwork*')
        portal2.enableLog('*portalnetwork*')
        await portal1.start()
      } else if (data.toString().includes('UDP proxy listening on')) {
        const port = parseInt(data.toString().split('UDP proxy listening on  127.0.0.1')[1])
        if (!portal2.client.isStarted()) {
          portal1.client.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
          await portal2.start()
        } else if (portal2.client.isStarted()) {
          portal2.client.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
          let done = false
          while (!done) {
            const res = await portal2.sendPing(portal1.client.enr, SubprotocolIds.HistoryNetwork)
            if (res && res.enrSeq === 5n) {
              st.pass('Nodes connected and played PING/PONG')
              await end(child, [portal1, portal2], st)
              done = true
              break
            }
          }
        }
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
        portal1.enableLog('')
        portal2.enableLog('')
        portal1.on('ContentAdded', (blockHash) => {
          if (blockHash === '0x8faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220') {
            st.pass('OFFER/ACCEPT/uTP Stream succeeded')
            end(child, [portal1, portal2], st)
          }
        })
        await portal1.start()
      } else if (data.toString().includes('UDP proxy listening on')) {
        const port = parseInt(data.toString().split('UDP proxy listening on  127.0.0.1')[1])
        if (!portal2.client.isStarted()) {
          portal1.client.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
          await portal2.start()
        } else if (portal2.client.isStarted()) {
          portal2.client.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))

          await portal2.sendPing(portal1.client.enr, SubprotocolIds.HistoryNetwork)
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
            SubprotocolIds.HistoryNetwork
          )
        }
      }
    })
  })
})
