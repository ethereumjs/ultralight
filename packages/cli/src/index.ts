import fs from 'fs'
import { createKeypairFromPeerId, ENR } from '@chainsafe/discv5'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Server as RPCServer } from 'jayson/promise'
import http from 'http'
import * as PromClient from 'prom-client'
import debug from 'debug'
import { RPCManager } from './rpc'
import { setupMetrics } from './metrics'
const level = require('level')

const args: any = yargs(hideBin(process.argv))
  .option('pk', {
    describe: 'base64 string encoded protobuf serialized private key',
    string: true,
  })
  .option('bootnode', {
    describe: 'ENR of Bootnode',
    string: true,
  })
  .option('bindAddress', {
    describe: 'initial IP address and UDP port to bind to',
    optional: true,
    string: true,
    default: '127.0.0.1:5500',
  })
  .option('bootnodeList', {
    describe: 'path to a file containing a list of bootnode ENRs',
    optional: true,
    string: true,
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
  .option('metrics', {
    describe: 'Turn on Prometheus metrics reporting',
    boolean: true,
    default: false,
  })
  .option('metricsPort', {
    describe: 'Port exposed for metrics scraping',
    number: true,
    default: 18545,
  })
  .option('dataDir', {
    describe: 'data directory where content is stored',
    string: true,
    optional: true,
  }).argv

const register = new PromClient.Registry()

const reportMetrics = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(200)
  res.end(await register.metrics())
}

const main = async () => {
  let id: PeerId
  if (!args.pk) {
    id = await PeerId.create({ keyType: 'secp256k1' })
  } else {
    id = await PeerId.createFromPrivKey(args.pk)
  }
  const enr = ENR.createFromPeerId(id)
  const addrOpts = args.bindAddress.split(':')
  const initMa = new Multiaddr(`/ip4/${addrOpts[0]}/udp/${addrOpts[1]}`)

  const log = debug(enr.nodeId.slice(0, 5)).extend('ultralight')
  enr.setLocationMultiaddr(initMa)
  enr.encode(createKeypairFromPeerId(id).privateKey)
  const metrics = setupMetrics()
  let db
  if (args.datadir) {
    db = level(args.datadir)
  }
  const portal = new PortalNetwork(
    {
      enr: enr,
      peerId: id,
      multiaddr: initMa,
    },
    2n ** 256n,
    db,
    metrics
  )
  // cache private key signature to ensure ENR can be encoded on startup
  portal.client.enr.encode(createKeypairFromPeerId(id).privateKey)

  portal.enableLog('*ultralight*, *portalnetwork*, *uTP*, *discv5*')
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
    portal.addBootNode(args.bootnode, SubNetworkIds.HistoryNetwork)
  }
  if (args.bootnodeList) {
    const bootnodeData = fs.readFileSync(args.bootnodeList, 'utf-8')
    const bootnodes = bootnodeData.split('\n')
    bootnodes.forEach((enr) => {
      if (enr.startsWith('enr:-')) {
        try {
          portal.addBootNode(enr, SubNetworkIds.HistoryNetwork)
        } catch {}
      }
    })
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
    if (metricsServer.listening) {
      metricsServer.close()
    }
    process.exit()
  })
}

main().catch((err) => {
  console.log('Encountered an error', err.message)
  console.log('Shutting down...')
})
