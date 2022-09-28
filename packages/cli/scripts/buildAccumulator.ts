import jayson from 'jayson/promise/index.js'
import { fromHexString, ProtocolId, toHexString, blockFromRpc } from 'portalnetwork'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Common } from '@ethereumjs/common'
const { Client } = jayson
import fs from 'fs-extra'
const args: any = yargs(hideBin(process.argv))
    .option('blockHeight', {
        describe: 'block height to build accumulator to',
        number: true,
        default: 9000
    }).argv

const main = async () => {
    const web3 = Client.http({ host: '127.0.0.1', port: 8545 })
    const ultralight = Client.http({ host: '127.0.0.1', port: 8544 })
  //  const peer0 = Client.http({host: '127.0.0.1', port: 8546})
    const genesisJson = await fs.readJSON('/home/jim/development/ethjs/packages/client/test/sim/configs/geth-genesis.json')

    const common = Common.fromGethGenesis(genesisJson, { genesisHash: Buffer.from('51c7fe41be669f69c45c33a56982cbde405313342d9e2b00d7c91a7b284dd4f8'), chain: 'geth-genesis'})
    for (let x = 1; x < args.blockHeight; x++) {
        const web3res = await web3.request('eth_getBlockByNumber', ['0x'+x.toString(16), true])
        console.log(web3res)

        const block = blockFromRpc(web3res.result, [],  { common })
        const res2 = await ultralight.request('portal_addBlockToHistory', [toHexString(block.hash()), toHexString(block.serialize())])
        console.log(x, res2)
    }
}

main()