import { Client, HttpClient } from 'jayson/promise'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import blocks from '../blocks200000-210000.json'

type Node = {
  node: HttpClient
  enr: string
}

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
  let bootNodes: Node[] = []

  for (let i = 0; i < 8; i++) {
    const boot = Client.http({ port: 8546 + i })
    const bootEnr = (await boot.request('portal_nodeEnr', [])).result
    const bootNode: Node = { node: boot, enr: bootEnr }
    bootNodes.push(bootNode)
  }
  const testBlocks: [string, any][] = Object.entries(blocks).slice(0, args.blocks)

  const idx = Math.floor(Math.random() * 8)
  const randomNode: Node = bootNodes[idx]
  const requestor: HttpClient = randomNode.node
  const b = idx + (1 % 8)
  const search = await requestor.request('eth_getBlockByHash', [testBlocks[b][0], true])
  console.log(search)

  console.log('Done')
}

main()
