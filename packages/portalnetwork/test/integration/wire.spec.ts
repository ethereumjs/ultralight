import tape from 'tape'
import { spawn } from 'child_process'
import PeerId from 'peer-id'
import { ENR, EntryStatus } from '@chainsafe/discv5'
import { Multiaddr } from 'multiaddr'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'
import { HistoryNetworkContentTypes } from '../../src/historySubnetwork/types'
import { fromHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from '../../src/historySubnetwork'


tape('Portal Wire Spec Testing', async (t) => {
    t.test('clients should start and connect', (st) => {
        const file = require.resolve('../../../proxy/dist/index.js')
        const child = spawn(process.execPath, [file])
        let portal1: PortalNetwork
        let portal2: PortalNetwork

        child.stdout.on('data', async (data) => {
            if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
                st.pass('proxy started successfully')
                setupNetwork()
            }
        })
        const end = async () => {
            child.stdout.removeAllListeners()
            child.kill('SIGINT')
            await portal1.stop()
            await portal2.stop()
            st.end()
        }

        const setupNetwork = async () => {
            const id1 = await PeerId.create({ keyType: "secp256k1" });
            const enr1 = ENR.createFromPeerId(id1);
            enr1.setLocationMultiaddr(new Multiaddr("/ip4/127.0.0.1/udp/0"));
            const id2 = await PeerId.create({ keyType: "secp256k1" });
            const enr2 = ENR.createFromPeerId(id2);
            enr2.setLocationMultiaddr(new Multiaddr("/ip4/127.0.0.1/udp/0"));
            portal1 = new PortalNetwork(
                {
                    enr: enr1,
                    peerId: id1,
                    multiaddr: enr2.getLocationMultiaddr('udp')!,
                    transport: "wss",
                    proxyAddress: "ws://127.0.0.1:5050",
                },
                1
            );
            portal2 = new PortalNetwork(
                {
                    enr: enr2,
                    peerId: id2,
                    multiaddr: enr2.getLocationMultiaddr('udp')!,
                    transport: "wss",
                    proxyAddress: "ws://127.0.0.1:5050",
                },
                1
            );
            portal1.client.once("multiaddrUpdated", () => portal2.start())
            portal1.once("Stream", () => console.log('THIS IS THE STREAM'))
            portal2.client.once("multiaddrUpdated", async () => {
                portal2.historyNetworkRoutingTable.insertOrUpdate(portal1.client.enr, EntryStatus.Connected)
                const res = await portal2.sendPing(portal1.client.enr.nodeId, SubNetworkIds.HistoryNetwork)
                if (res?.enrSeq === 5n) {
                    st.pass('nodes connected and played PING/PONG')
                    const testBlock = require('./testBlock.json')
                    await portal2.addContentToHistory(1, HistoryNetworkContentTypes.BlockBody, testBlock.blockHash, testBlock.rlp)
                    await portal2.sendOffer(portal1.client.enr.nodeId, [HistoryNetworkContentKeyUnionType.serialize({ selector: 0, value: { chainId: 1, blockHash: fromHexString(testBlock.blockHash) } })], SubNetworkIds.HistoryNetwork)
                }
            })

            //    portal2.enableLog()
            portal1.enableLog()

            await portal1.start()
        }
    })
})