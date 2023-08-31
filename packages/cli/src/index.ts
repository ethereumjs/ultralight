import * as fs from 'fs'
import { PortalNetwork, ProtocolId, fromHexString } from 'portalnetwork'
import type { PeerId } from '@libp2p/interface-peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import yargs from 'yargs/yargs'
// eslint-disable-next-line node/file-extension-in-import
import { hideBin } from 'yargs/helpers'
import jayson from 'jayson/promise/index.js'
import http from 'http'
import * as PromClient from 'prom-client'
import debug from 'debug'
import { setupMetrics } from './metrics.js'
import { isValidEnr, addBootNode } from './util.js'
import { Level } from 'level'
import { createFromProtobuf, createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { execSync } from 'child_process'
import { RPCManager } from './rpc/rpc.js'
import { SignableENR } from '@chainsafe/discv5'

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
    optional: true,
    string: true,
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
  const cmd = 'hostname -i'
  const pubIp = execSync(cmd).toString().split(':')
  const ip = args.rpcAddr ?? pubIp[0].trim()
  const log = debug('ultralight')
  let id: PeerId
  let web3: jayson.Client | undefined
  if (!args.pk) {
    id = await createSecp256k1PeerId()
  } else {
    id = await createFromProtobuf(fromHexString(args.pk))
  }
  const enr = SignableENR.createFromPeerId(id)
  const initMa: any = multiaddr(`/ip4/${ip}/udp/${args.rpcPort}`)
  enr.setLocationMultiaddr(initMa)

  const metrics = setupMetrics()
  let db
  if (args.dataDir) {
    db = new Level<string, string>(args.dataDir)
  }
  const config = {
    enr: enr,
    peerId: id,
    config: {
      enrUpdate: true,
      addrVotesToUpdateEnr: 5,
      allowUnverifiedSessions: true,
    },
    bindAddrs: {
      ip4: initMa,
    },
  } as any
  const portal = await PortalNetwork.create({
    config: config,
    radius: 2n ** 256n - 1n,
    //@ts-ignore Because level doesn't know how to get along with itself
    db,
    metrics,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.BeaconLightClientNetwork],
    dataDir: args.datadir,
  })
  portal.discv5.enableLogs()

  portal.enableLog('*ultralight*, *Portal*, *ultralight:RPC*')
  let metricsServer: http.Server | undefined

  if (args.metrics) {
    metricsServer = http.createServer(reportMetrics)
    Object.entries(metrics).forEach((entry) => {
      register.registerMetric(entry[1])
    })
    metricsServer?.listen(args.metricsPort)
    log(`Started Metrics Server address=http://${ip}:${args.metricsPort}`)
  }
  await portal.start()

  // TODO - make this more intelligent
  const protocol = portal.protocols.get(ProtocolId.HistoryNetwork)
  if (isValidEnr(args.bootnode)) {
    addBootNode(protocol, args.bootnode)
  }
  if (args.bootnodeList) {
    const bootnodeData = fs.readFileSync(args.bootnodeList, 'utf-8')
    const bootnodes = bootnodeData.split('\n')
    bootnodes.forEach((enr) => {
      if (isValidEnr(enr)) {
        addBootNode(protocol, enr)
      }
    })
  }

  // Proof of concept for a web3 bridge to import block headers from a locally running full node
  if (args.web3) {
    const [host, port] = args.web3.split(':')
    if (host && port) {
      web3 = jayson.Client.http({ host: host, port: port })
    }
  }

  if (args.rpc) {
    const manager = new RPCManager(portal)
    const methods = manager.getMethods()
    const server = new jayson.Server(methods, {
      router: function (method, params) {
        // `_methods` is not part of the jayson.Server interface but exists on the object
        // but the docs recommend this pattern for custom routing
        // https://github.com/tedeh/jayson/blob/HEAD/examples/method_routing/server.js
        if (!this.getMethod && web3) {
          return new jayson.Method(async function () {
            const res = await web3!.request(method, params)
            if (res.result) return res.result
            else return res.error
          })
        } else {
          log(`Received ${method} with params: ${JSON.stringify(params)}`)
          return this.getMethod(method)
        }
      },
    })
    server.http().listen(args.rpcPort)

    log(`Started JSON RPC Server address=http://${ip}:${args.rpcPort}`)
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
