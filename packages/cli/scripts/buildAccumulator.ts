import { BlockHeader } from '@ethereumjs/block'
import jayson from 'jayson/promise/index.js'
import { bytesToHex, hexToBytes } from 'portalnetwork'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const { Client } = jayson

const args: any = yargs(hideBin(process.argv)).option('blockHeight', {
  describe: 'block height to build accumulator to',
  number: true,
  default: 9000,
}).argv

const main = async () => {
  const web3 = Client.http({ host: '127.0.0.1', port: 8544 })
  const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })

  console.log(args.blockHeight)

  for (let x = 1; x < args.blockHeight; x++) {
    const web3res = await web3.request('debug_getHeaderRlp', [x])
    const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(hexToBytes(web3res.result)), {
      setHardfork: true,
    })
    const res2 = await ultralight.request('portal_addBlockHeaderToHistory', [
      bytesToHex(header.hash()),
      web3res.result,
    ])
    console.log(x, res2)
  }
}

void main()
