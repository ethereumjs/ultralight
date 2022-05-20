import fs from 'fs'
import { PortalNetwork, ProtocolId, ENR, createKeypairFromPeerId } from 'portalnetwork'
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
  let initMa: Multiaddr
  if (args.bindAddress) {
    const addrOpts = args.bindAddress.split(':')
    initMa = new Multiaddr(`/ip4/${addrOpts[0]}/udp/${addrOpts[1]}`)
    enr.setLocationMultiaddr(initMa)
  } else {
    initMa = new Multiaddr()
  }
  const log = debug(enr.nodeId.slice(0, 5)).extend('ultralight')

  enr.encode(createKeypairFromPeerId(id).privateKey)
  const metrics = setupMetrics()
  let db
  if (args.datadir) {
    db = level(args.datadir)
  }
  const portal = new PortalNetwork({
    config: {
      enr: enr,
      peerId: id,
      multiaddr: initMa,
      config: {
        enrUpdate: true,
        addrVotesToUpdateEnr: 1,
        allowUnverifiedSessions: true,
      },
    },
    radius: 2n ** 256n,
    db,
    metrics,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })
  // cache private key signature to ensure ENR can be encoded on startup
  portal.discv5.enr.encode(createKeypairFromPeerId(id).privateKey)
  portal.discv5.enableLogs()
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
  const protocol = portal.protocols.get(ProtocolId.HistoryNetwork)
  if (args.bootnode) {
    protocol!.addBootNode(args.bootnode)
  }
  if (args.bootnodeList) {
    const bootnodeData = fs.readFileSync(args.bootnodeList, 'utf-8')
    const bootnodes = bootnodeData.split('\n')
    bootnodes.forEach((enr) => {
      if (enr.startsWith('enr:-')) {
        try {
          protocol!.addBootNode(enr)
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
