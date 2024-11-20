import { Client } from 'jayson/promise'
import { NetworkId } from 'portalnetwork'
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
  let bootEnrs: string[] = []
  for (let i = 0; i < 8; i++) {
    const boot = Client.http({ port: 8546 + i })
    const bootEnr = (await boot.request('portal_nodeEnr', [])).result
    bootEnrs.push(bootEnr)
  }

  const newPeer = Client.http({ port: 8546 + 9 })
  const add = await newPeer.request('portal_addBootNode', [bootEnrs[0], NetworkId.HistoryNetwork])
  console.log(add)
  bootEnrs.forEach((boot) => {
    newPeer.request('portal_nodeLookup', [NetworkId.HistoryNetwork, boot])
  })

  console.log('Done')
}

main()
