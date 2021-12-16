import { ENR } from "@chainsafe/discv5";
import { PortalNetwork, SubNetworkIds } from "portalnetwork";
import PeerId from "peer-id";
import { Multiaddr } from "multiaddr";
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
const readline = require('readline')

readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)

const args: any = yargs(hideBin(process.argv))
    .option('bootnode', {
        describe: 'Bootnode',
        default: '',
    }).argv

const main = async () => {
    const file = require.resolve('../../proxy/dist/index.js')
    const child = spawn(process.execPath, [file])
    const id = await PeerId.create({ keyType: "secp256k1" });
    const enr = ENR.createFromPeerId(id);
    enr.setLocationMultiaddr(new Multiaddr("/ip4/127.0.0.1/udp/0"));
    const portal = new PortalNetwork(
        {
            enr: enr,
            peerId: id,
            multiaddr: new Multiaddr("/ip4/127.0.0.1/udp/0"),
            transport: "wss",
            proxyAddress: "ws://127.0.0.1:5050",
        },
        1
    );
    portal.enableLog();
    await portal.start();
    let bootnodeId: string
    if (args.bootnode) {
        portal.client.addEnr(args.bootnode)
        bootnodeId = ENR.decodeTxt(args.bootnode).nodeId
    }
    console.log('Press p to ping bootnode')
    console.log('Press n to send FINDNODES to bootnode')
    process.stdin.on('keypress', async (str, key) => {
        switch (key.name) {
            case 'p': {
                console.log('Sending PING to', bootnodeId);
                const res = await portal.sendPing(bootnodeId, SubNetworkIds.HistoryNetworkId)
                console.log('Received PONG response', res);
                break;
            }
            case 'n': {
                console.log('Sending FINDNODES to ', bootnodeId)
                const res = await portal.sendFindNodes(bootnodeId, Uint16Array.from([0, 1, 2]), SubNetworkIds.HistoryNetworkId)
                console.log(res)
            }
            case 'c': if (key.ctrl) {
                console.log('Exiting')
                child.kill(0)
                process.exit(0);
            }
        }
    })
}

main()