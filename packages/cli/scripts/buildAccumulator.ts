import { Client, HttpClient } from 'jayson/promise'
import {  ProtocolId, toHexString } from 'portalnetwork'
import { Block, BlockData, BlockHeader } from '@ethereumjs/block';

type StoredBlock = {
  number: number,
  hash: string,
  raw: string,
  rawHeader: string
}

async function testnet(number: number): Promise<[HttpClient[], string[]]> {
  const bootnodes = []
  const enrs = []
  for (let i=0;i<number;i++) {
    const bootnode = Client.http({ host: '127.0.0.1', port: 8547 + i})
    const bootnodeENR = await bootnode.request('portal_nodeEnr', [])
    console.log(bootnodeENR)
    bootnodes.push(bootnode)
    enrs.push(bootnodeENR.result)
  }
  return [bootnodes, enrs]
}


const main = async () => {
  const n = 1
  const b = 9000
  const builder = Client.http({ host: '127.0.0.1', port: 8546 })
  const builderEnr = await builder.request('portal_nodeEnr', [])
  console.log(builderEnr)
  const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })
  const ultralightENR = await ultralight.request('portal_nodeEnr', [])
  console.log(ultralightENR)
  
  const web3 = Client.http({ host: '127.0.0.1', port: 8544 })
  // Start a fully connected testnet with N bootnodes
  const [bootnodes, bootnodeEnrs] = await testnet(n)
  console.log(bootnodeEnrs)
  
  for (let i=0;i<b;i++) {
    let header = await web3.request('debug_getHeaderRlp', [i])
    let block = await web3.request('debug_getBlockRlp', [i])
    let headerhash = BlockHeader.fromRLPSerializedHeader(header.result).hash()
    let blockhash = Block.fromRLPSerializedBlock(block.result).hash()
    if (!headerhash.equals(blockhash)) console.log('Hash doesnt Mash')
    const res1 = await builder.request('portal_addBlockToHistory', [
      toHexString(headerhash),
      block.result,
    ])
    console.log((i + 1),  res1)
    const bn = Math.floor(Math.random() * bootnodes.length)
    const res2 = await bootnodes[bn].request('portal_addBlockToHistory', [
          toHexString(headerhash),
          block.result,
        ])
        console.log((i + 1),bn,  res2)
  }

  bootnodes.slice(1).forEach( async (bootnode, idx) => {
    const ping = await bootnode.request('portal_ping', [bootnodeEnrs[0], ProtocolId.HistoryNetwork])
    console.log(ping)
  })
  
  // Fill builder with blocks starting at 1
  // Seed in blocks to bootnodes spread around testnet.  Bootnodes should gossip.    
  // A new Ultralight node joins the network.
  // The builder node joins the network.
  // Ultralight pings the builder and asks for snapshot
  
  const ping1 = await ultralight.request('portal_ping', [bootnodeEnrs[0], ProtocolId.HistoryNetwork])
  console.log(ping1)
    const ping3 = await ultralight.request('portal_ping', [builderEnr.result, ProtocolId.HistoryNetwork])
  console.log(ping3)
  const res = await ultralight.request('portal_history_getSnapshot', [builderEnr.result])  
  console.log(res)
  
  // What *should* happen: 
  // Ultralight will receive a serialized accumulator from bootnode
  // Ultralight will generate a Block Index (array) from the values in the CurrentEpoch container of the Accumulator
  // This will look like an array whose length is the height of the accumulator.  The array will be mostly empty, with the last <8192 slots filled in. 
  // Ultralight will request eth_getBlockByHash from the network for the oldest hash in the array (Lowest block number)
  // Ultralight will then do protocol.backFill() and request eth_getBlockByHash for the parent hash -- and repeat until the block index is full

}
main()
