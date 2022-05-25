import { Client } from 'jayson/promise'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'

const args: any = yargs(hideBin(process.argv))
    .option('sourceFile', {
        describe: 'JSON file containing block data to feed into network',
        string: true,
        optional: true
    })
    .option('addBlockByHash', {
      describe: 'specify a specific blockhash to add to the local node DB',
      string: true,
      optional: true
    })
    .option('rpcPort', {
        describe: 'RPC port of node',
        number: true,
        demandOption: true
    })
    .option('numBlocks', {
        describe: 'number of blocks to seed on node',
        number: true,
    })
    .option('numNodes', {
        describe: 'number of nodes in devnet',
        number: true,
        demandOption: true
    })
    .option('promConfig', {
        describe: 'create prometheus scrape_target file',
        boolean: true,
        default: true
    })
    .option('blockHash', {
      describe: 'specify a block hash to send to other nodes',
      string: true,
      optional: true
    })


const main = async () => {
  let bootNode = Client.http({ port: args.rpcPort })
  const blockData = require(args.sourceFile)
  const blocks = Object.entries(blockData)

  const bootNodeEnr = await bootNode.request('portal_nodeEnr', [])
  const targets = [`localhost:1${args.rpcPort}`]
  for (let x = 1; x < args.numNodes; x++) {
      targets.push(`localhost:1${args.rpcPort + x}`)
    const client = Client.http({ port: args.rpcPort + x })
    await client.request('portal_addBootNode', [bootNodeEnr.result])
  }
  let targetBlob = [Object.assign({
      "targets": targets,
      "labels": { "env": "devnet" }
  })]
  fs.writeFileSync('./targets.json', JSON.stringify(targetBlob, null, 2))


  for (let x = 1; x < args.numNodes; x++) {
    const _client = Client.http({ port: args.rpcPort + x })
    const res = await _client.request('portal_ping', [bootNodeEnr.result])
    console.log(res)
  }

  if (args.numBlocks) {
    for (let x = 0; x < args.numBlocks; x++) {
      await bootNode.request('portal_addBlockToHistory', [blocks[x][0], (blocks[x][1] as any).rlp])
    }
  }
  if (args.sourceFile && args.addBlockByHash) {
    await bootNode.request('portal_addBlockToHistory', [args.blockHash, blockData[args.blockHash].rlp])
  }
  if (args.blockHash) {
    const _client = Client.http({ port: args.rpcPort + 1 })
    await _client.request('eth_getBlockByHash', [args.blockHash, true])
  }
}

main()
