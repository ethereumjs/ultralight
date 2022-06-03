import { Client } from 'jayson/promise'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process' 

const args: any = yargs(hideBin(process.argv))
    .option('pks', {
        describe: 'text file containing private keys for nodes in devnet',
        string: true,
        optional: true,
        default: './scripts/pks.txt'
    }).option('promConfig', {
        describe: 'create prometheus scrape_target file',
        boolean: true,
        default: false
    }).argv

const main = async () => {
    const pks = fs.readFileSync(args.pks, { encoding: 'utf8'}).split('\n')
    const file = require.resolve(process.cwd() + '/dist/index.js')
    let children: ChildProcessWithoutNullStreams[] = []
    pks.forEach((key, idx) => { //@ts-ignore
        const child = spawn(process.execPath, [file, `--bindAddress=127.0.0.1:${5000 + idx}`, `--pk=${key}`, `--rpcPort=${8545+idx}`, `--metrics=true`, `--metricsPort=${18545+idx}`], {stdio: ['pipe', this.stderr, process.stderr]})
        children.push(child)
    })

    if (args.promConfig) {
        const targets:any[] = []
        children.forEach((_child, idx) => targets.push(`localhost:${18545 + idx}`))
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
        clearInterval(interval)
      })
}

main()