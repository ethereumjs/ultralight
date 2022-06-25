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
  const n = 4
  const b = 120
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
  let randomIdx = Math.floor(Math.random() * b)
  let randomHash: string = ""
  for (let i=0;i<b;i++) {
    let header = await web3.request('debug_getHeaderRlp', [i])
    let block = await web3.request('debug_getBlockRlp', [i])
    let headerhash = BlockHeader.fromRLPSerializedHeader(header.result).hash()
    let blockhash = Block.fromRLPSerializedBlock(block.result).hash()
    if (!headerhash.equals(blockhash)) console.log('Hash doesnt Mash')
    if (i === randomIdx) {randomHash = toHexString(headerhash)}
    const bn = Math.floor(Math.random() * bootnodes.length)
    const res2 = await bootnodes[bn].request('portal_addBlockToHistory', [
          toHexString(headerhash),
          block.result,
        ])
        console.log((i + 1),bn,  res2)
  }
  const ping0 = await ultralight.request('portal_ping', [bootnodeEnrs[0], ProtocolId.HistoryNetwork])
  const ping1 = await ultralight.request('portal_ping', [bootnodeEnrs[1], ProtocolId.HistoryNetwork])
  const ping2 = await ultralight.request('portal_ping', [bootnodeEnrs[2], ProtocolId.HistoryNetwork])
  console.log(ping0, ping1, ping2)
  bootnodeEnrs.forEach( async (enr, idx) => {

      const ping1 = await bootnodes[1].request('portal_ping', [enr, ProtocolId.HistoryNetwork])
      const ping2 = await bootnodes[2].request('portal_ping', [enr, ProtocolId.HistoryNetwork])
    console.log(ping1, ping2)
    })

    // Bootnodes will interconnect but probably not gossip content.

    setTimeout( async () => {
        const block = await ultralight.request('eth_getBlockByHash', [randomHash, true])
        console.log(block)
    }, 2000)

  
  // What *should* happen: 
    // Get Block request should circulate network and return block.
    // Should trigger some gossip.
}
main()
