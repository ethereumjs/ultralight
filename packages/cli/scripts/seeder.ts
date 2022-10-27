import jayson from 'jayson/promise/index.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ProtocolId } from 'portalnetwork'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { Client } = jayson

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
    .option('requestblockHash', {
      describe: 'specify a block hash to request from other nodes',
      string: true,
      optional: true
    }).argv


const main = async () => {
  let bootNode = Client.http({ port: args.rpcPort })
  const blockData = require(args.sourceFile)
  const blocks = Object.entries(blockData)

  const bootNodeEnr = await bootNode.request('discv5_nodeInfo', [])
  for (let x = 1; x < args.numNodes; x++) {
    const client = Client.http({ port: args.rpcPort + x })
    await client.request('portal_historyAddBootNode', [bootNodeEnr.result])
  }

  for (let x = 1; x < args.numNodes; x++) {
    const _client = Client.http({ port: args.rpcPort + x })
    const res = await _client.request('portal_historyPing', [bootNodeEnr.result.enr, ProtocolId.HistoryNetwork])
    console.log(res)
    if (res.error) {
      throw new Error('should not error here')
    }
  }

  if (args.numBlocks) {
    for (let x = 0; x < args.numBlocks; x++) {
      await bootNode.request('ultralight_addBlockToHistory', [blocks[x][0], (blocks[x][1] as any).rlp])
    }
  }
  if (args.sourceFile && args.addBlockByHash) {
    await bootNode.request('ultralight_addBlockToHistory', [args.addBlockByHash, blockData[args.addBlockByHash].rlp])
  }
  if (args.requestblockHash) {
    const _client = Client.http({ port: args.rpcPort + 1 })
    await _client.request('eth_getBlockByHash', [args.requestblockHash, true])
  }
}

main()
