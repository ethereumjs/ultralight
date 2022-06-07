import { Client } from 'jayson/promise'
import { BlockHeader } from '@ethereumjs/block'
import { fromHexString } from 'portalnetwork'
const main = async () => {
    const web3 = Client.http({ host: '127.0.0.1', port: 8546 })
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })
    for (let x = 1; x < 5; x++) {
        const web3res = await web3.request('debug_getHeaderRlp', [x])
        const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(fromHexString(web3res.result)))
        const res2 = await ultralight.request('portal_addBlockHeaderToHistory', ['0x'+ header.hash().toString('hex'),web3res.result])
        console.log(res2)
    }
}

main()