import { ENR } from '@chainsafe/discv5'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { Server as RPCServer } from 'jayson/promise'
import { RPCManager } from './rpc'
import dgram from 'dgram'
const args: any = yargs(hideBin(process.argv))
  .option('bootnode', {
    describe: 'ENR of Bootnode',
    string: true,
  })
  .option('proxy', {
    describe: 'Start proxy service',
    boolean: true,
    default: true,
  })
  .option('nat', {
    describe: 'NAT Traversal options for proxy',
    choices: ['localhost', 'lan', 'extip'],
    default: 'localhost',
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
  portal.enableLog('discv5*, RPC*, portalnetwork*, proxy*')
  await portal.start()
  if (args.bootnode) {
    portal.sendPing(args.bootnode, SubNetworkIds.HistoryNetwork)
  }
  const { rpc, rpcport, rpcaddr } = args
  if (rpc) {
    const manager = new RPCManager(portal)
    const methods = manager.getMethods()
    const server = new RPCServer(methods)
    server.http().listen(rpcport)
    console.log(`Started JSON RPC Server address=http://${rpcaddr}:${rpcport}`)
  }
}

const main = async () => {
  let proxyStarted = false

  if (args.proxy === true) {
    // Spawn a child process that runs the proxy
    const file = require.resolve('../../proxy/dist/index.js')
    child = spawn(process.execPath, [file, '--nat', args.nat])
    child.stderr.on('data', (data) => {
      if (!proxyStarted && data.toString().includes('websocket server listening')) {
        run()
        proxyStarted = true
        child.stderr.removeAllListeners()
      }
    })
  } else {
    run()
  }
}

main().catch((err) => {
  console.log('Encountered an error', err.message)
  console.log('Shutting down...')
  child?.kill(0)
})
