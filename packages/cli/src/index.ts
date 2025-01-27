import { execSync } from 'child_process'
import http from 'http'
import debug from 'debug'
import jayson from 'jayson/promise/index.js'
import { PortalNetwork, cliConfig } from 'portalnetwork'
import * as PromClient from 'prom-client'
import { args } from './cliArgs.js'
import { RPCManager } from './rpc/rpc.js'

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

  portalConfig.operatingSystemAndCpuArchitecture = args.arch
  portalConfig.shortCommit = args.commit ?? execSync('git rev-parse HEAD').toString().slice(0, 7)

  const portal = await PortalNetwork.create(portalConfig)

  log(`discv5Config: ${JSON.stringify(portal.discv5['config'], null, 2)}`)

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

  process.on('uncaughtException', (err) => {
    // discv5 is occasionally throwing an uncaught exception when handling
    // incoming messages related to the handshake process.  These can safely be
    // ignored
    console.error('Uncaught Exception:', err)
  })
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
