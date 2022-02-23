import tape from 'tape'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import PeerId from 'peer-id'
import { ENR, EntryStatus } from '@chainsafe/discv5'
import { Multiaddr } from 'multiaddr'
import { PortalNetwork, SubNetworkIds } from '../../src'
import { HistoryNetworkContentTypes } from '../../src/historySubnetwork/types'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from '../../src/historySubnetwork'
import { Block, BlockHeader } from '@ethereumjs/block'

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
  const portal1 = new PortalNetwork(
    {
      enr: enr1,
      peerId: id1,
      multiaddr: enr2.getLocationMultiaddr('udp')!,
      transport: 'wss',
      proxyAddress: 'ws://127.0.0.1:5050',
    },
    2n ** 256n
  )
  const portal2 = new PortalNetwork(
    {
      enr: enr2,
      peerId: id2,
      multiaddr: enr2.getLocationMultiaddr('udp')!,
      transport: 'wss',
      proxyAddress: 'ws://127.0.0.1:5050',
    },
    2n ** 256n
  )
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

        portal1.client.once('multiaddrUpdated', () => portal2.start())

        portal2.client.once('multiaddrUpdated', async () => {
          portal2.historyNetworkRoutingTable.insertOrUpdate(
            portal1.client.enr,
            EntryStatus.Connected
          )
          const res = await portal2.sendPing(
            portal1.client.enr.nodeId,
            SubNetworkIds.HistoryNetwork
          )
          if (res?.enrSeq === 5n) {
            st.pass('nodes connected and played PING/PONG')
            end(child, [portal1, portal2], st)
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

    child.stderr.on('data', async (data) => {
      if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
        const nodes = await setupNetwork()
        portal1 = nodes[0]
        portal2 = nodes[1]
        portal1.once('Stream', (_, content) => {
          const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(content))
          st.equals(
            toHexString(header.hash()),
            '0x8faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220',
            'OFFER/ACCEPT/uTP Stream succeeded'
          )
          end(child, [portal1, portal2], st)
        })

        portal1.client.once('multiaddrUpdated', () => portal2.start())

        portal2.client.once('multiaddrUpdated', async () => {
          portal2.historyNetworkRoutingTable.insertOrUpdate(
            portal1.client.enr,
            EntryStatus.Connected
          )
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
