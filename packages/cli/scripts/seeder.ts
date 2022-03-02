import { Client } from 'jayson/promise'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'

const args: any = yargs(hideBin(process.argv))
    .option('sourceFile', {
        describe: 'JSON file containing block data to feed into network',
        string: true,
        demandOption: true
    })
    .option('rpcPort', {
        describe: 'RPC port of node',
        number: true,
        demandOption: true
    })
    .option('numBlocks', {
        describe: 'number of blocks to seed on node',
        number: true,
        demandOption: true
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
    }).argv

const main = async () => {
  let client = Client.http({ port: args.rpcPort })
  const blockData = require(args.sourceFile)
  const blocks = Object.entries(blockData)
  for (let x = 0; x < args.numBlocks; x++) {
    await client.request('portal_addBlockToHistory', [blocks[x][0], (blocks[x][1] as any).rlp])
  }
  const enr = await client.request('portal_nodeEnr', [])
  const targets = [`localhost:1${args.rpcPort}`]
  for (let x = 1; x < args.numNodes; x++) {
      targets.push(`localhost:1${args.rpcPort + x}`)
      client = Client.http({ port: args.rpcPort + x })
      await client.request('portal_addBootNode', [enr.result])
  }
  let targetBlob = [Object.assign({
      "targets": targets,
      "labels": { "env": "devnet" }
  })]
  fs.writeFileSync('./targets.json', JSON.stringify(targetBlob, null, 2))


  //   for (let x = 1; x < args.numNodes; x++) {
  //     client = Client.http({ port: args.rpcPort + x })
  //     await client.request('portal_addBootNode', [enr.result])
  //   }


  for (let x = 1; x < args.numNodes; x++) {
    const _client = Client.http({ port: args.rpcPort + x })
    await _client.request('portal_ping', [enr.result])
  }
  for (let x = 1; x < args.numNodes; x++) {
    const _client = Client.http({ port: args.rpcPort + x })
    await _client.request('portal_utp_find_content_test', [enr.result])
  }
  // for (let x = 1; x < args.numNodes; x++) {
  //   const _client = Client.http({ port: args.rpcPort + x })
  //   const enr = await _client.request('portal_nodeEnr', [])
  //   await client.request('portal_utp_offer_test', [enr.result])
  // }
  // for (let x = 1; x < args.numNodes; x++) {
  //   const _client = Client.http({ port: args.rpcPort + x })
  //   // const enr = await _client.request('portal_nodeEnr', [])
  //   await _client.request('portal_utp_send_syn', [enr.result])
  // }
}

main()
