import type { HttpClient } from 'jayson/promise';
import { Client } from 'jayson/promise'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const args: any = yargs(hideBin(process.argv)).option('bootnodes', {
  describe: 'how man bootnodes',
  number: true,
  default: 8,
}).argv

const main = async () => {
  const bootNodes: { node: HttpClient; enr: string }[] = []

  console.log(args.bootnodes)
  for (let i = 0; i < args.bootnodes; i++) {
    const boot = Client.http({ port: 8546 + i })
    const bootEnr = (await boot.request('portal_nodeEnr', [])).result
    bootNodes.push({ node: boot, enr: bootEnr })
    console.log(bootEnr)
  }

  bootNodes.forEach(async ({ node, enr }, idx) => {
    if (idx > 0) {
      for (let j = idx - 1; j >= 0; j--) {
        const boot = bootNodes[j].enr
        const join = await node.request('portal_addBootNode', [boot, '0x500b'])
        console.log(join)
      }
    }
  })

  console.log('Done')
}

main()
