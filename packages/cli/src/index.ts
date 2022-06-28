import * as fs from 'fs'
import {
  PortalNetwork,
  ProtocolId,
  ENR,
  HeaderAccumulator,
  HeaderAccumulatorType,
  fromHexString,
} from 'portalnetwork'
import * as PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Server as RPCServer, Client as RpcClient, Method } from 'jayson/promise'
import http = require('http')
import * as PromClient from 'prom-client'
import debug from 'debug'
import { RPCManager } from './rpc'
import { setupMetrics } from './metrics'
import { Level } from 'level'
const fromDisk = require('../scripts/storedAccumulator.json')
const O = require('../scripts/storedHashLists.json')

const V: [string, string][] = Object.values(O)
const hashListFromDisk: Record<string, string> = Object.fromEntries(V)

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
  })
  .option('accumulator', {
    describe: 'stored accumulator in json',
    boolean: true,
    optional: true,
  })
  .option('web3', {
    describe: 'web3 JSON RPC HTTP endpoint for local Ethereum node for sourcing chain data',
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
  let web3: RpcClient | undefined
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
  const metrics = setupMetrics()
  let db
  if (args.dataDir) {
    db = new Level<string, string>(args.dataDir)
  }
  let accumulator = undefined
  if (args.accumulator) {
    const serialized = fromDisk.serialized
    const stored = HeaderAccumulatorType.deserialize(fromHexString(serialized))
    accumulator = new HeaderAccumulator({
      initFromGenesis: false,
      storedAccumulator: {
        historicalEpochs: stored.historicalEpochs,
        currentEpoch: stored.currentEpoch,
      },
    })
  }

  const portal = await PortalNetwork.create({
    config: {
      enr: enr,
      peerId: id,
      multiaddr: initMa,
      config: {
        enrUpdate: true,
        addrVotesToUpdateEnr: 5,
        allowUnverifiedSessions: true,
      },
    },
    radius: 2n ** 256n - 1n,
    //@ts-ignore Because level doesn't know how to get along with itself
    db,
    metrics,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.CanonicalIndicesNetwork],
    dataDir: args.datadir,
    accumulator: accumulator,
    hashLists: hashListFromDisk,
  })
  portal.discv5.enableLogs()
  portal.enableLog('*ultralight*, *Portal*, *uTP*')
  let metricsServer: http.Server | undefined
  log(fromDisk.hashTreeRoot, args.accumulator)
  if (args.metrics) {
    metricsServer = http.createServer(reportMetrics)
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

  // Proof of concept for a web3 bridge to import block headers from a locally running full node
  if (args.web3) {
    const [host, port] = args.web3.split(':')
    if (host && port) {
      web3 = RpcClient.http({ host: host, port: port })
    }
  }

  if (args.rpc) {
    const manager = new RPCManager(portal)
    const methods = manager.getMethods()
    const server = new RPCServer(methods, {
      router: function (method, params) {
        if (!this._methods[method] && web3) {
          return new Method(async function () {
            const res = await web3!.request(method, params)
            if (res.result) return res.result
            else return res.error
          })
        } else return this._methods[method]
      },
    })

    server.http().listen(args.rpcPort)
    log(`Started JSON RPC Server address=http://${args.rpcAddr}:${args.rpcPort}`)
  }

  process.on('SIGINT', async () => {
    console.log('Caught close signal, shutting down...')
    await portal.stop()
    if (metricsServer?.listening) {
      metricsServer.close()
    }
    process.exit()
  })
}

main().catch((err) => {
  console.log('Encountered an error', err)
  console.log('Shutting down...')
})

export * from './rpc'
