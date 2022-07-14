import tape from 'tape'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { Multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, ProtocolId } from '../../src/index.js'
import { HistoryNetworkContentTypes } from '../../src/subprotocols/history/types.js'
import { fromHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from '../../src/subprotocols/history/index.js'
import { Block } from '@ethereumjs/block'
import { TransportLayer } from '../../src/client/types.js'
import { HistoryProtocol } from '../../src/subprotocols/history/history.js'
import { createRequire } from 'module'

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

tape('Portal Network Wire Spec Integration Tests', (t) => {
  t.test('clients start and connect to each other', (st) => {
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
        st.pass('proxy started successfully')
        const nodes = await setupNetwork()
        portal1 = nodes[0]
        portal2 = nodes[1]
        portal1.enableLog('*Portal*,*discv5*')
        portal2.enableLog('*Portal*,*discv5*')
        await portal1.start()
      } else if (data.toString().includes('UDP proxy listening on')) {
        const port = parseInt(data.toString().split('UDP proxy listening on  127.0.0.1')[1])
        if (!portal2.discv5.isStarted()) {
          portal1.discv5.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
          await portal2.start()
        } else if (portal2.discv5.isStarted()) {
          portal2.discv5.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
          let done = false
          const protocol = portal2.protocols.get(ProtocolId.HistoryNetwork)
          if (!protocol) throw new Error('should have History Protocol')
          while (!done) {
            const res = await protocol.sendPing(portal1.discv5.enr)
            if (res && (res as any).enrSeq >= 1n) {
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

    child.stderr.on('data', async (data) => {
      if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
        const nodes = await setupNetwork()
        portal1 = nodes[0]
        portal2 = nodes[1]
        portal1.enableLog('*Portal*')
        portal2.enableLog('*Portal*')
        portal1.on('ContentAdded', (blockHash) => {
          if (blockHash === '0x8faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220') {
            st.pass('OFFER/ACCEPT/uTP Stream succeeded')
            end(child, [portal1, portal2], st)
          }
        })
        await portal1.start()
      } else if (data.toString().includes('UDP proxy listening on')) {
        const port = parseInt(data.toString().split('UDP proxy listening on  127.0.0.1')[1])
        if (!portal2.discv5.isStarted()) {
          portal1.discv5.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
          await portal2.start()
        } else if (portal2.discv5.isStarted()) {
          portal2.discv5.enr.setLocationMultiaddr(new Multiaddr(`/ip4/127.0.0.1/udp/${port}`))
          const protocol = portal2.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
          if (!protocol) throw new Error('should have History Protocol')
          await protocol.sendPing(portal1.discv5.enr)
          await portal2.discv5.sendPing(portal1.discv5.enr)
          const testBlocks = require('./testBlocks.json')
          const testBlockKeys: Uint8Array[] = []
          for (const blockData of testBlocks) {
            const testBlock = Block.fromRLPSerializedBlock(
              Buffer.from(fromHexString(blockData.rlp))
            )
            await protocol.addContentToHistory(
              1,
              HistoryNetworkContentTypes.BlockHeader,
              '0x' + testBlock.header.hash().toString('hex'),
              testBlock.header.serialize()
            )
            testBlockKeys.push(
              HistoryNetworkContentKeyUnionType.serialize({
                selector: 0,
                value: { chainId: 1, blockHash: Uint8Array.from(testBlock.header.hash()) },
              })
            )
          }

          await protocol.sendOffer(portal1.discv5.enr.nodeId, testBlockKeys)
        }
      }
    })
  })
})
