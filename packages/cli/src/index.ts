import { ENR } from "@chainsafe/discv5";
import { PortalNetwork, SubNetworkIds } from "portalnetwork";
import PeerId from "peer-id";
import { Multiaddr } from "multiaddr";

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
    portal.client.addEnr("enr:-IS4QJBALBigZVoKyz-NDBV8z34-pkVHU9yMxa6qXEqhCKYxOs5Psw6r5ueFOnBDOjsmgMGpC3Qjyr41By34wab1sKIBgmlkgnY0gmlwhKEjVaWJc2VjcDI1NmsxoQOSGugH1jSdiE_fRK1FIBe9oLxaWH8D_7xXSnaOVBe-SYN1ZHCCIyg")
    const res = await portal.sendPing("639ab17d4327ae42826b838ca77796778ebbc22ee0279d5cfe3a86016fe2d9bd", SubNetworkIds.HistoryNetworkId)
    console.log(res)
    process.on('SIGINT', async () => {
        console.log('Exiting')
        await portal.client.stop()
        process.exit(0)
    })
}

main()