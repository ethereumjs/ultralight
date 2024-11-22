import type { HttpClient } from 'jayson/promise'
import { Client } from 'jayson/promise'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import blocks from '../blocks200000-210000.json'

const args: any = yargs(hideBin(process.argv))
  .option('blocks', {
    describe: 'how many blocks to use in test',
    number: true,
    optional: true,
    default: 16,
  })
  .option('nodes', {
    describe: 'how many test nodes',
    number: true,
    default: 32,
  })
  .option('bootnodes', {
    describe: 'how man bootnodes',
    number: true,
    default: 8,
  })

const main = async () => {
  const bootNodes: { node: HttpClient; enr: string }[] = []

  for (let i = 0; i < 8; i++) {
    const boot = Client.http({ port: 8546 + i })
    const bootEnr = (await boot.request('portal_nodeEnr', [])).result
    bootNodes.push({ node: boot, enr: bootEnr })
  }

  const testBlocks: [string, any][] = Object.entries(blocks).slice(0, 16)
  testBlocks.forEach(async (block, idx) => {
    const node = bootNodes[idx % 8].node
    const add: string = await node.request('portal_addBlockToHistory', [block[0], block[1].rlp])
    console.log(add)
  })

  console.log('Done')
}

main()
