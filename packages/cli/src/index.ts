import * as fs from 'fs'
import { BeaconLightClientNetwork, PortalNetwork, ProtocolId, fromHexString } from 'portalnetwork'
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
import { addBootNode } from './util.js'
import { Level } from 'level'
import { createFromProtobuf, createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { execSync } from 'child_process'
import { RPCManager } from './rpc/rpc.js'
import { SignableENR } from '@chainsafe/discv5'
import { Enr } from './rpc/schema/types.js'
import { ClientOpts } from './types.js'

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
    describe: 'subprotocols to enable',
    array: true,
    optional: true,
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
  const ip = args.bindAddress
    ? args.bindAddress.split(':')[0]
    : execSync(cmd).toString().split(' ')[0].trim()
  const bindPort = args.bindAddress ? args.bindAddress.split(':')[1] : 9000 // Default discv5 port
  const log = debug('ultralight')
  let id: PeerId
  let web3: jayson.Client | undefined
  if (!args.pk) {
    id = await createSecp256k1PeerId()
  } else {
    id = await createFromProtobuf(fromHexString(args.pk))
  }
  const enr = SignableENR.createFromPeerId(id)
  const initMa = multiaddr(`/ip4/${ip}/udp/${bindPort}`)
  enr.setLocationMultiaddr(initMa)

  process.on('uncaughtException', (err) => {
    // Hack to catch uncaught exceptions that are thrown in async events/functions and aren't caught in
    // main process (notably a seeming new discv5 bug where certain RPC failures aren't properly handled)
    log(`Uncaught error: ${err.message}`)
    log(err)
  })

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
    trustedBlockRoot: args.trustedBlockRoot,
  } as any
  let networks: ProtocolId[] = []
  if (args.networks) {
    for (const network of args.networks) {
      switch (network) {
        case 'history':
          networks.push(ProtocolId.HistoryNetwork)
          break
        case 'beacon':
          networks.push(ProtocolId.BeaconLightClientNetwork)
          break
      }
    }
  } else {
    networks = [ProtocolId.HistoryNetwork]
  }

  if (args.trustedBlockRoot !== undefined) {
    networks.push(ProtocolId.BeaconLightClientNetwork)
  }
  const portal = await PortalNetwork.create({
    config: config,
    radius: 2n ** 256n - 1n,
    //@ts-ignore Because level doesn't know how to get along with itself
    db,
    metrics,
    supportedProtocols: networks,
    dataDir: args.dataDir,
  })
  portal.discv5.enableLogs()

  portal.enableLog(
    'ultralight,-uTP,-FINDNODES,*LightClient:DEBUG,*LightClient:INFO,*BeaconLightClientNetwork',
  )
  const rpcAddr = args.rpcAddr ?? ip // Set RPC address (used by metrics server and rpc server)
  let metricsServer: http.Server | undefined

  if (args.metrics) {
    metricsServer = http.createServer(reportMetrics)
    Object.entries(metrics).forEach((entry) => {
      register.registerMetric(entry[1])
    })
    metricsServer?.listen(args.metricsPort, rpcAddr)
    log(`Started Metrics Server address=http://${rpcAddr}:${args.metricsPort}`)
  }

  await portal.start()

  const bootnodes: Array<Enr> = []
  if (args.bootnode) {
    bootnodes.push(args.bootnode)
  }
  if (args.bootnodeList) {
    const bootnodeData = fs.readFileSync(args.bootnodeList, 'utf-8')
    const bootnodeList = bootnodeData.split('\n')
    for (const bootnode of bootnodeList) {
      bootnodes.push(bootnode)
    }
  }
  try {
    for (const protocol of portal.protocols) {
      for (const bootnode of bootnodes) {
        await addBootNode(protocol[0], protocol[1], bootnode)
      }
    }
  } catch (error: any) {
    log(`${error.message ?? error}`)
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
    server.http().listen(args.rpcPort, rpcAddr)

    log(`Started JSON RPC Server address=http://${rpcAddr}:${args.rpcPort}`)

    if (args.trustedBlockRoot !== undefined) {
      const beaconProtocol = portal.protocols.get(
        ProtocolId.BeaconLightClientNetwork,
      ) as BeaconLightClientNetwork
      await beaconProtocol.initializeLightClient(args.trustedBlockRoot)
      beaconProtocol.lightClient?.start()
    }
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
  console.error('Encountered an error', err)
  console.error('Shutting down...')
})
