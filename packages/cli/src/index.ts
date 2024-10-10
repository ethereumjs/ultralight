import { execSync } from 'child_process'
import debug from 'debug'
import http from 'http'
import jayson from 'jayson/promise/index.js'
import { PortalNetwork, cliConfig } from 'portalnetwork'
import * as PromClient from 'prom-client'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { RPCManager } from './rpc/rpc.js'

import type { ClientOpts } from './types.js'

const args: ClientOpts = yargs(hideBin(process.argv))
  .parserConfiguration({
    'dot-notation': false,
  })
  .option('pk', {
    describe: 'base64 string encoded protobuf serialized private key',
    optional: true,
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
    number: true,
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
  })
  .option('networks', {
    describe: 'subnetworks to enable',
    string: true,
    default: 'history,beacon,state',
  })
  .option('storage', {
    describe: 'Storage space allocated to DB in MB',
    string: true,
    default: '1024, 1024, 1024',
  })
  .option('storageHistory', {
    describe: `Storage space allocated to HistoryNetwork DB in MB`,
    number: true,
    default: 1024,
  })
  .option('storageBeacon', {
    describe: `Storage space allocated to BeaconChainNetwork DB in MB`,
    number: true,
    default: 1024,
  })
  .option('storageState', {
    describe: `Storage space allocated to StateNetwork DB in MB`,
    number: true,
    default: 1024,
  })
  .option('trustedBlockRoot', {
    describe: 'a trusted blockroot to start light client syncing of the beacon chain',
    string: true,
    optional: true,
  })
  .strict().argv as ClientOpts

const register = new PromClient.Registry()

const reportMetrics = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(200)
  res.end(await register.metrics())
}

const main = async () => {
  const cmd = 'hostname -I'
  const ip =
    args.bindAddress !== undefined
      ? args.bindAddress.split(':')[0]
      : execSync(cmd).toString().split(' ')[0].trim()
  const log = debug('ultralight')
  let web3: jayson.Client | undefined

  const portalConfig = await cliConfig(args)

  const portal = await PortalNetwork.create(portalConfig)

  const rpcAddr = args.rpcAddr ?? ip // Set RPC address (used by metrics server and rpc server)
  let metricsServer: http.Server | undefined

  if (args.metrics) {
    metricsServer = http.createServer(reportMetrics)
    for (const entry of Object.entries(portalConfig.metrics!)) {
      register.registerMetric(entry[1])
    }
    metricsServer?.listen(args.metricsPort, rpcAddr)
    log(`Started Metrics Server address=http://${rpcAddr}:${args.metricsPort}`)
  }

  await portal.start()

  // Proof of concept for a web3 bridge to import block headers from a locally running full node
  if (args.web3 !== undefined) {
    const [host, port] = args.web3.split(':')
    if (host && port) {
      web3 = jayson.Client.http({ host, port })
    }
  }

  if (args.rpc) {
    const manager = new RPCManager(portal)
    const methods = manager.getMethods()
    const server = new jayson.Server(methods, {
      router(method, params) {
        // `_methods` is not part of the jayson.Server interface but exists on the object
        // but the docs recommend this pattern for custom routing
        // https://github.com/tedeh/jayson/blob/HEAD/examples/method_routing/server.js
        if (this.getMethod(method) === undefined && web3) {
          return new jayson.Method(async function () {
            const res = await web3!.request(method, params)
            if (res.result !== undefined) return res.result
            else return res.error
          })
        } else {
          log(
            `Received ${method} with params: ${
              params !== undefined &&
              (params as any[]).map((p, idx) => {
                return `${idx}: ${p.toString().slice(0, 64)}${
                  p.toString().length > 64 ? '...' : ''
                }`
              })
            }`,
          )
          return this.getMethod(method)
        }
      },
    })
    server.http().listen(args.rpcPort, rpcAddr)
    log(
      `Started Portal Client on Networks: ${[...portal.networks.values()].map((n) => n.constructor.name)}`,
    )
    log(`Started JSON RPC Server address=http://${rpcAddr}:${args.rpcPort}`)
  }

  process.on('SIGINT', async () => {
    console.log('Caught close signal, shutting down...')
    await portal.stop()
    if (metricsServer?.listening === true) {
      metricsServer.close()
    }
    process.exit()
  })
}

main().catch((err) => {
  console.error('Encountered an error', err)
  console.error('Shutting down...')
})
