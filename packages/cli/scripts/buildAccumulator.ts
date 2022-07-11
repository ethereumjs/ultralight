import jayson from 'jayson/promise/index.js'
import { BlockHeader } from '@ethereumjs/block'
import { fromHexString, ProtocolId } from 'portalnetwork'
const { Client } = jayson

const main = async () => {
    const web3 = Client.http({ host: '127.0.0.1', port: 8544 })
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })
    const peer0 = Client.http({host: '127.0.0.1', port: 8546})

    for (let x = 1; x < 9000; x++) {
        const web3res = await web3.request('debug_getHeaderRlp', [x])
        const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(fromHexString(web3res.result)))
        const res2 = await ultralight.request('portal_addBlockHeaderToHistory', ['0x'+ header.hash().toString('hex'),web3res.result])
        console.log(res2)
    }
    const ultralightENR = await ultralight.request('portal_nodeEnr', [])
    await peer0.request('portal_ping', [ultralightENR.result, ProtocolId.HistoryNetwork])
    await peer0.request('portal_history_getSnapshot', [ultralightENR.result])
}

main()