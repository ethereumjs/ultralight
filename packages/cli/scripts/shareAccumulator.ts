import jayson from 'jayson/promise/index.js'
import { NetworkId } from 'portalnetwork'

const main = async () => {
  const bootnode = jayson.Client.http({ host: '127.0.0.1', port: 8545 })
  const bootnodeEnr = await bootnode.request('portal_nodeEnr', [])

  for (let i = 0; i < 10; i++) {
    const ultralight = jayson.Client.http({ host: '127.0.0.1', port: 8546 + i })
    const ping = await ultralight.request('portal_ping', [
      bootnodeEnr.result,
      NetworkId.HistoryNetwork,
    ])
    console.log(ping)
    const res = await ultralight.request('portal_history_getSnapshot', [bootnodeEnr.result])
    console.log(res)
  }
  
}
main()
