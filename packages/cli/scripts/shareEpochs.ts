import { Block } from '@ethereumjs/block'
import jayson from 'jayson/promise/index.js'
import { NetworkId, toHexString } from 'portalnetwork'

// async function testnet(number: number): Promise<[HttpClient[], string[]]> {
//   const bootnodes = []
//   const enrs = []
//   for (let i=0;i<number;i++) {
//     const bootnode = Client.http({ host: '127.0.0.1', port: 8547 + i})
//     const bootnodeENR = await bootnode.request('portal_nodeEnr', [])
//     console.log(bootnodeENR)
//     bootnodes.push(bootnode)
//     enrs.push(bootnodeENR.result)
//   }
//   return [bootnodes, enrs]
// }

// First start an Ethereum client capable of `debug_getBlockRlp` (GETH) on port 8544
// Then start CLI devnet with N ultralight nodes on ports 8545 + i
// Then run this script

const main = async () => {
  const b = 9000

  const builder = jayson.Client.http({ host: '127.0.0.1', port: 8546 })
  const builderEnr = await builder.request('portal_nodeEnr', [])
  console.log(builderEnr)
  const ultralight = jayson.Client.http({ host: '127.0.0.1', port: 8545 })
  const ultralightENR = await ultralight.request('portal_nodeEnr', [])
  console.log(ultralightENR)

  const web3 = jayson.Client.http({ host: '127.0.0.1', port: 8544 })
  //   const [bootnodes, bootnodeEnrs] = await testnet(n)
  //   console.log(bootnodeEnrs)

  for (let i = 0; i < b; i++) {
    const block = await web3.request('debug_getBlockRlp', [i])
    const blockhash = Block.fromRLPSerializedBlock(block.result).hash()
    const res1 = await builder.request('portal_addBlockToHistory', [
      toHexString(blockhash),
      block.result,
    ])
    console.log(i + 1, res1)
    // const bn = Math.floor(Math.random() * bootnodes.length)
    // const res2 = await bootnodes[bn].request('portal_addBlockToHistory', [
    //       toHexString(blockhash),
    //       block.result,
    //     ])
    //     console.log((i + 1),bn,  res2)
  }

  //   bootnodes.slice(1).forEach( async (bootnode, idx) => {
  //     const ping = await bootnode.request('portal_ping', [bootnodeEnrs[0], NetworkId.HistoryNetwork])
  //     console.log(ping)
  //   })

  // Fill builder with blocks starting at 1
  // Seed in blocks to bootnodes spread around testnet.  Bootnodes should gossip.
  // A new Ultralight node joins the network.
  // The builder node joins the network.
  // Ultralight pings the builder and asks for snapshot

  //   const ping1 = await ultralight.request('portal_ping', [bootnodeEnrs[0], NetworkId.HistoryNetwork])
  //   console.log(ping1)
  const ping3 = await ultralight.request('portal_ping', [
    builderEnr.result,
    NetworkId.HistoryNetwork,
  ])
  console.log(ping3)
  const res = await ultralight.request('portal_history_getSnapshot', [builderEnr.result])
  console.log(res)
}
void main()
