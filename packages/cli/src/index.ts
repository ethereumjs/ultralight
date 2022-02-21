import { ENR } from '@chainsafe/discv5'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { Server as RPCServer } from 'jayson/promise'
import http from 'http'
import * as PromClient from 'prom-client'
import debug from 'debug'
import { RPCManager } from './rpc'
const log = debug('ultralight')

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
  .option('rpcPort', {
    describe: 'HTTP-RPC server listening port',
    default: 8545,
  })
  .option('rpcAddr', {
    describe: 'HTTP-RPC server listening interface address',
    default: 'localhost',
  })
  .options('metrics', {
    describe: 'Turn on Prometheus metrics reporting',
    boolean: true,
    default: false,
  })
  .options('metricsPort', {
    describe: 'Port exposed for metrics scraping',
    number: true,
    default: 18545,
  }).argv

let child: ChildProcessWithoutNullStreams
const register = new PromClient.Registry()

const reportMetrics = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(200)
  res.end(await register.metrics())
}

const setupMetrics = () => {
  return {
    knownDiscv5Nodes: new PromClient.Gauge({
      name: 'ultralight_known_discv5_peers',
      help: 'how many peers are in discv5 routing table',
      async collect() { },
    }),
    knownHistoryNodes: new PromClient.Gauge({
      name: 'ultralight_known_history_peers',
      help: 'how many peers are in discv5 routing table',
      async collect() { },
    }),
    totalContentLookups: new PromClient.Gauge<string>({
      name: 'ultralight_total_content_lookups',
      help: 'total number of content lookups initiated',
    }),
    successfulContentLookups: new PromClient.Counter({
      name: 'ultralight_successful_content_lookups',
      help: 'how many content lookups successfully returned content',
    }),
    failedContentLookups: new PromClient.Counter({
      name: 'ultralight_failed_content_lookups',
      help: 'how many content lookups failed to return content',
    }),
  }
}

const run = async () => {
  const id = await PeerId.create({ keyType: 'secp256k1' })
  const enr = ENR.createFromPeerId(id)
  enr.setLocationMultiaddr(new Multiaddr('/ip4/127.0.0.1/udp/0'))
  const metrics = setupMetrics()
  const portal = new PortalNetwork(
    {
      enr: enr,
      peerId: id,
      multiaddr: new Multiaddr('/ip4/127.0.0.1/udp/0'),
      transport: 'wss',
      proxyAddress: 'ws://127.0.0.1:5050',
    },
    1,
    undefined,
    metrics
  )
  portal.enableLog('discv5*, ultralight*, portalnetwork*, proxy*')
  const metricsServer = http.createServer(reportMetrics)

  if (args.metrics) {
    Object.entries(metrics).forEach((entry) => {
      register.registerMetric(entry[1])
    })
    metricsServer.listen(args.metricsPort)
    log(`Started Metrics Server address=http://${args.rpcAddr}:${args.metricsPort}`)
  }
  await portal.start()
  if (args.bootnode) {
    portal.sendPing(args.bootnode, SubNetworkIds.HistoryNetwork)
  }
  if (args.rpc) {
    const manager = new RPCManager(portal)
    const methods = manager.getMethods()
    const server = new RPCServer(methods)
    server.http().listen(args.rpcPort)
    log(`Started JSON RPC Server address=http://${args.rpcAddr}:${args.rpcPort}`)
  }
  process.on('SIGINT', async () => {
    console.log('Caught close signal, shutting down...')
    await portal.stop()
    child.kill(0)
    if (metricsServer.listening) {
      metricsServer.close()
    }
    process.exit()
  })
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
