import { ENR } from '@chainsafe/discv5'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { Server as RPCServer } from 'jayson/promise'
import { methods } from './rpc'
import { HistoryNetworkContentTypes } from 'portalnetwork/dist/historySubnetwork/types'
const readline = require('readline')

readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)

const args: any = yargs(hideBin(process.argv))
    .option('bootnode', {
        describe: 'ENR of Bootnode',
        default: '',
    })
    .option('proxy', {
        describe: 'Start proxy service',
        boolean: true,
        default: true
    })
    .option('nat', {
        describe: 'NAT Traversal options for proxy',
        choices: ['none', 'extip'],
        default: 'none',
        string: true
    })
    .option('rpc', {
        describe: 'Enable the JSON-RPC server with HTTP endpoint',
        boolean: true,
        default: true,
    })
    .option('rpcport', {
        describe: 'HTTP-RPC server listening port',
        default: 8545,
    })
    .option('rpcaddr', {
        describe: 'HTTP-RPC server listening interface address',
        default: 'localhost',
    }).argv

let child: ChildProcessWithoutNullStreams

const run = async () => {
    const id = await PeerId.create({ keyType: 'secp256k1' })
    const enr = ENR.createFromPeerId(id)
    enr.setLocationMultiaddr(new Multiaddr('/ip4/127.0.0.1/udp/0'))
    const portal = new PortalNetwork(
        {
            enr: enr,
            peerId: id,
            multiaddr: new Multiaddr('/ip4/127.0.0.1/udp/0'),
            transport: 'wss',
            proxyAddress: 'ws://127.0.0.1:5050',
        },
        1
    )
    portal.enableLog("discv5*, RPC*, portalnetwork*")
    await portal.start()
    // Add stock content for History Network
    const block1HeaderRlp = "0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4"
    const block1Hash = "0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6"
    portal.addContentToHistory(1, HistoryNetworkContentTypes.BlockHeader, block1Hash, block1HeaderRlp)

    let bootnodeId: string
    if (args.bootnode) {
        portal.client.addEnr(args.bootnode)
        bootnodeId = ENR.decodeTxt(args.bootnode).nodeId
        console.log(`Press p to ping ${bootnodeId}`)
        console.log(`Press n to send FINDNODES to ${bootnodeId}`)
    }
    const { rpc, rpcport, rpcaddr } = args
    if (rpc) {
        const server = new RPCServer(methods)
        server.http().listen(rpcport)
        console.log(`Started JSON RPC Server address=http://${rpcaddr}:${rpcport}`)
    }
    process.stdin.on('keypress', async (str, key) => {
        switch (key.name) {
            case 'p': {
                if (!bootnodeId) return
                console.log('Sending PING to', bootnodeId)
                const res = await portal.sendPing(bootnodeId, SubNetworkIds.HistoryNetwork)
                console.log('Received PONG response', res)
                break
            }
            case 'n': {
                if (!bootnodeId) return
                console.log('Sending FINDNODES to ', bootnodeId)
                const res = await portal.sendFindNodes(bootnodeId, Uint16Array.from([0, 1, 2]), SubNetworkIds.HistoryNetwork)
                console.log(res)
                break
            }
            case 'e': {
                console.log('Current ENR is:', portal.client.enr.encodeTxt())
                break
            }
            case 'c': if (key.ctrl) {
                console.log('Exiting')
                child?.kill(0)
                process.exit(0)
            }
        }
    })
}

const main = async () => {
    let proxyStarted = false
    if (args.proxy === true) {
        // Spawn a child process that runs the proxy 
        const file = require.resolve('../../proxy/dist/index.js')
        child = spawn(process.execPath, [file, args.nat])
        child.stdout.on('data', async (data) => {
            // Prints all proxy logs to the console
            console.log(data.toString())
            if (!proxyStarted && data.toString().includes("websocket server listening")) {
                run()
                proxyStarted = true
            }
        })
        child.stderr.on('data', (data) => {
            // Prints all proxy errors to the console
            console.log(data.toString())
        })
    }
}

main().catch((err) => {
    console.log('Encountered an error', err.message)
    console.log('Shutting down...')
    child?.kill(0)
})
