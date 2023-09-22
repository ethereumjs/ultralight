import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as fs from 'fs'
import { spawn, ChildProcessByStdio, execSync } from 'child_process'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const args: any = yargs(hideBin(process.argv))
    .option('pks', {
        describe: 'text file containing private keys for nodes in devnet',
        string: true,
        optional: true,
    }) .option('numNodes', {
        describe: 'number of random nodes to start',
        number: true,
        optional: true,
    }) .option('ip', {
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
      optional: true
    }).argv

const main = async () => {
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
          args.networks ? `--networks=${(args.networks as Array<string>).join(' ')}` : ''
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
          args.networks ? `--networks=${(args.networks as Array<string>).join(' ')}` : ''
        ],
        { stdio: ['pipe', 'pipe', process.stderr] }
      )
      children.push(child)
    }
  }

    if (args.promConfig) {
        const targets:any[] = []
        children.forEach((_child, idx) => targets.push(`${ip}:1${args.port + idx}`))
        let targetBlob = [Object.assign({
            "targets": targets,
            "labels": { "env": "devnet" }
        })]
        fs.writeFileSync('./targets.json', JSON.stringify(targetBlob, null, 2))
    }
    const interval = setInterval(() => {}, 1000)
    console.log(`starting ${children.length} nodes`)
    process.on('SIGINT', async () => {
        console.log('Caught close signal, shutting down...')
        children.forEach((child) => child.kill())
        clearInterval(interval as NodeJS.Timeout)
      })
}

main()
