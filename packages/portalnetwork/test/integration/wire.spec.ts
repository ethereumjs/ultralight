var wtf = require('wtfnode');
import tape from 'tape'
import { spawn } from 'child_process'
import PeerId from 'peer-id'
import { ENR, EntryStatus } from '@chainsafe/discv5'
import { Multiaddr } from 'multiaddr'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'


tape('Portal Wire Spec Testing', async (t) => {
    t.test('clients should start and connect', { timeout: 20000 }, (st) => {
        const file = require.resolve('../../../proxy/dist/index.js')
        const child = spawn(process.execPath, [file])
        let portal1: PortalNetwork
        let portal2: PortalNetwork

        child.stdout.on('data', async (data) => {
            if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
                st.pass('proxy started successfully')
                setupNetwork()
            }
            console.log(data.toString())
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
            portal1.enableLog()
            portal2.enableLog()
            portal1.client.on("multiaddrUpdated", () => portal2.start())
            portal2.client.on("multiaddrUpdated", async () => {
                portal2.historyNetworkRoutingTable.insertOrUpdate(portal1.client.enr, EntryStatus.Connected)
                const res = await portal2.sendPing(portal1.client.enr.nodeId, SubNetworkIds.HistoryNetwork)
                if (res?.enrSeq === 5n) {
                    st.pass('nodes connected and played PING/PONG')
                }
                end()
            })
            await portal1.start()
        }
    })
})