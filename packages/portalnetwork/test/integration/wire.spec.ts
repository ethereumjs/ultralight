import tape from 'tape'
import { spawn } from 'child_process'
import PeerId from 'peer-id'
import { ENR } from '@chainsafe/discv5'
import { Multiaddr } from 'multiaddr'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'

tape('Client start-up', async (t) => {
    const file = require.resolve('../../../proxy/dist/index.js')
    const child = spawn(process.execPath, [file])
    child.stdout.on('data', async (data) => {
        if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
            t.pass('proxy started successfully')
        }
    })
    child.stderr.on('data', (data) => {
        console.log(data.toString())
        t.fail('proxy encountered an error')
    })
    const id1 = await PeerId.create({ keyType: "secp256k1" });
    const enr1 = ENR.createFromPeerId(id1);
    enr1.setLocationMultiaddr(new Multiaddr("/ip4/127.0.0.1/udp/0"));
    const id2 = await PeerId.create({ keyType: "secp256k1" });
    const enr2 = ENR.createFromPeerId(id2);
    enr2.setLocationMultiaddr(new Multiaddr("/ip4/127.0.0.1/udp/0"));
    const portal1 = new PortalNetwork(
        {
            enr: enr1,
            peerId: id1,
            multiaddr: enr2.getLocationMultiaddr('udp')!,
            transport: "wss",
            proxyAddress: "ws://127.0.0.1:5050",
        },
        1
    );
    const portal2 = new PortalNetwork(
        {
            enr: enr2,
            peerId: id2,
            multiaddr: enr2.getLocationMultiaddr('udp')!,
            transport: "wss",
            proxyAddress: "ws://127.0.0.1:5050",
        },
        1
    );/*
    portal2.client.on("multiaddrUpdated", async () => {
        console.log('updated portal1 multiaddr')
        t.pass('updated second multiaddr')
        portal1.client.addEnr(portal2.client.enr);

        const res = await portal1.sendPing(portal2.client.enr.nodeId, SubNetworkIds.HistoryNetworkId)
        console.log(res)
        child.kill()
        await portal1.client.stop();
        await portal2.client.stop();
        t.end(0)
    })*/
    portal1.enableLog()
    portal2.enableLog()
    await portal1.start();

    await portal2.start();

})