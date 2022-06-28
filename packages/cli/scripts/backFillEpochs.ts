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
  const b = 25000
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
    bootnodes.forEach(async (builder, idx) => {
        const res1 = await builder.request('portal_addBlockToHistory', [
        toHexString(headerhash),
        block.result,
        ])
        console.log('block: ',(i + 1), ' bootnode: ', idx,  res1)
        })
    }

    for (let i=0; i< bootnodes.length; i++) {
      const ping = await ultralight.request('portal_ping', [bootnodeEnrs[i], ProtocolId.CanonicalIndicesNetwork])
      console.log(ping)
  }

  const hPing = await ultralight.request('portal_ping', [bootnodeEnrs[0], ProtocolId.HistoryNetwork])
  console.log(hPing)
  const snapshot = await ultralight.request('portal_history_getSnapshot', [bootnodeEnrs[0], ProtocolId.HistoryNetwork])
  console.log(snapshot)
}
main()
