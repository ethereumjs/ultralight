import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as fs from 'fs'
import { spawn, ChildProcessByStdio, execSync } from 'child_process'
import { createRequire } from 'module'
import jayson from 'jayson/promise/index.js'
import { DevnetOpts } from '../src/types.js'

const { Client } = jayson
const require = createRequire(import.meta.url)

const args: any = yargs(hideBin(process.argv))
  .option('pks', {
    describe: 'text file containing private keys for nodes in devnet',
    string: true,
    optional: true,
  }).option('numNodes', {
    describe: 'number of random nodes to start',
    number: true,
    default: 1,
    optional: true,
  }).option('ip', {
    describe: 'ip addr',
    string: true,
    optional: true,
  }).option('promConfig', {
    describe: 'create prometheus scrape_target file',
    boolean: true,
    default: false
  }).option('port', {
    describe: 'starting port number',
    number: true,
    default: 9000
  }).option('networks', {
    describe: 'supported subnetworks',
    array: true,
    default: ['history', 'beacon'],
    optional: true
  }).option('connectNodes', {
    describe: 'connet all nodes on network start',
    boolean: true,
    default: false
  }).strict().argv as DevnetOpts

const main = async () => {
  console.log(`starting ${args.numNodes} nodes`)

  const networks = args.networks && (args.networks as Array<string>).map(network => `--networks=${network}`)
  const cmd = 'hostname -I'
  const pubIp = execSync(cmd).toString().split(' ')
  const ip = args.ip ?? pubIp[0]
  let children: ChildProcessByStdio<any, any, null>[] = []
  const file = require.resolve(process.cwd() + '/dist/index.js')
  if (args.pks) {
    const pks = fs.readFileSync(args.pks, { encoding: 'utf8' }).split('\n')
    pks.forEach((key, idx) => {
      const child = spawn(
        process.execPath,
        [
          file,
          `--rpc`,
          `--rpcAddr=${ip}`,
          `--pk=${key}`,
          `--rpcPort=${8545 + idx}`,
          `--metrics=true`,
          `--metricsPort=${18545 + idx}`,
          `--bindAddress-${ip}:${args.port + idx}`,
          ...networks
        ],
        { stdio: ['pipe', 'pipe', process.stderr] }
      )
      children.push(child)
    })
  } else if (args.numNodes) {
    for (let x = 0; x < args.numNodes; x++) {
      const child = spawn(
        process.execPath,
        [
          file,
          `--rpcAddr=${ip}`,
          `--rpcPort=${8545 + x}`,
          `--metrics=true`,
          `--metricsPort=${18545 + x}`,
          `--bindAddress=${ip}:${args.port + x}`,
          ...networks
        ],
        { stdio: ['pipe', 'pipe', process.stderr] }
      )
      children.push(child)
    }
  }

  // Wait for nodes to start up
  await new Promise(resolve => setTimeout(() => { resolve(undefined) }, 3000))

  if (args.promConfig) {
    const targets: any[] = []
    children.forEach((_child, idx) => targets.push(`${ip}:1${args.port + idx}`))
    let targetBlob = [Object.assign({
      "targets": targets,
      "labels": { "env": "devnet" }
    })]
    fs.writeFileSync('./targets.json', JSON.stringify(targetBlob, null, 2))
  }

  // Connect nodes to other nodes in the network via `addBootNode`
  if (args.connectNodes) {
    console.log('connecting nodes')
    const ultralights: jayson.HttpClient[] = []
    for (let x = 0; x < 10; x++) {
      ultralights.push(Client.http({ host: '127.0.0.1', port: 8545 + x }))
    }

    for (let x = 0; x < args.numNodes; x++) {
      const peerEnr = await ultralights[x].request('discv5_nodeInfo', [])
      for (let y = 0; y < args.numNodes; y++) {
        if (y === x) continue
        for (const network of args.networks) {
          const res = await ultralights[y].request(`portal_${network}AddBootNode`, [peerEnr.result.enr])
        }

      }
    }
  }
  process.on('SIGINT', async () => {
    console.log('Caught close signal, shutting down...')

    children.forEach((child) => child.kill())
  })
}

main()
