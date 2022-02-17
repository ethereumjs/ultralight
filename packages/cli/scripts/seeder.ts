import { Client } from 'jayson/promise'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const args: any = yargs(hideBin(process.argv))
    .option('sourceFile', {
        describe: 'JSON file containing block data to feed into network',
        string: true,
    })
    .option('rpcPort', {
        describe: 'RPC port of node',
        number: true
    })
    .option('numBlocks', {
        describe: 'number of blocks to seed on node',
        number: true
    }).argv
const main = async () => {
    console.log(args)
    const client = Client.http({ port: args.rpcPort })
    const blockData = require(args.sourceFile)
    const blocks = Object.entries(blockData)
    for (let x = 0; x < args.numBlocks; x++) {
        await client.request('portal_addBlockToHistory', [blocks[x][0], (blocks[x][1] as any).rlp])
    }
}

main()