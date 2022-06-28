import { Client, HttpClient } from 'jayson/promise'
import {  ProtocolId, toHexString } from 'portalnetwork'
import { Block, BlockData, BlockHeader } from '@ethereumjs/block';
  
  const main = async () => {
    const hasAccumulator = Client.http({ host: '127.0.0.1', port: 8545 })
    const hasAccumulatorENR = await hasAccumulator.request('portal_nodeEnr', [])
    console.log(hasAccumulatorENR)
    
    const hasLists = Client.http({ host: '127.0.0.1', port: 8546 })
    const hasListsEnr = await hasLists.request('portal_nodeEnr', [])
    console.log(hasListsEnr)

    const ultralight = Client.http({ host: '127.0.0.1', port: 8547 })
    const ultralightENR = await ultralight.request('portal_nodeEnr', [])
    console.log(ultralightENR)
    
    
    const ping1 = await ultralight.request('portal_ping', [hasAccumulatorENR.result, ProtocolId.HistoryNetwork])
    console.log(ping1)
    const ping2 = await ultralight.request('portal_ping', [hasAccumulatorENR.result, ProtocolId.CanonicalIndicesNetwork])
    console.log(ping2)
    const ping3 = await ultralight.request('portal_ping', [hasListsEnr.result, ProtocolId.CanonicalIndicesNetwork])
    console.log(ping3)
    const accumulator = await ultralight.request('portal_history_getSnapshot', [hasAccumulatorENR.result])
    console.log(accumulator)
    
  }
  main()
  