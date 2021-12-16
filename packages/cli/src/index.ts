import { ENR } from "@chainsafe/discv5";
import { PortalNetwork, SubNetworkIds } from "portalnetwork";
import PeerId from "peer-id";
import { Multiaddr } from "multiaddr";
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
const readline = require('readline')
readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)

const args: any = yargs(hideBin(process.argv))
    .option('bootnode', {
        describe: 'Bootnode',
        default: '',
    }).argv

const main = async () => {
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
    await portal.start();
    portal.client.addEnr(args.bootnode)
    console.log('Press p to ping bootnode')
    process.stdin.on('keypress', async (str, key) => {
        switch (key.name) {
            case 'p': {
                console.log('Sending PING to', ENR.decodeTxt(args.bootnode).nodeId);
                const res = await portal.sendPing(ENR.decodeTxt(args.bootnode).nodeId, SubNetworkIds.HistoryNetworkId)
                console.log('Received PONG response', res);
                break;
            }
            case 'c': if (key.ctrl) process.exit(0);
        }
    })
}

main()