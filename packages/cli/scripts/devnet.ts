import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as fs from 'fs'
import { spawn, ChildProcessByStdio } from 'child_process' 
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
    }).option('promConfig', {
        describe: 'create prometheus scrape_target file',
        boolean: true,
        default: false
    }).argv

const main = async () => {
    let children: ChildProcessByStdio<any, any, null>[] = []
    const file = require.resolve(process.cwd() + '/dist/index.js')
    if (args.pks) {
    const pks = fs.readFileSync(args.pks, { encoding: 'utf8'}).split('\n')
    pks.forEach((key, idx) => { //@ts-ignore
        const child = spawn(process.execPath, [file, `--bindAddress=127.0.0.1:${5000 + idx}`, `--pk=${key}`, `--rpcPort=${8545+idx}`, `--metrics=true`, `--metricsPort=${18545+idx}`], {stdio: ['pipe', 'pipe', process.stderr]})
        children.push(child)
    })
    } else if (args.numNodes){
        for (let x = 0; x < args.numNodes; x++) {
            const child = spawn(process.execPath, [file, `--bindAddress=127.0.0.1:${5000 + x}`, `--rpcPort=${8545+x}`, `--metrics=true`, `--metricsPort=${18545+x}`], {stdio: ['pipe', 'pipe', process.stderr]})
            children.push(child)
        }
    }

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
