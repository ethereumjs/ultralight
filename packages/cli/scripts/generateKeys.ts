import { bytesToHex } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const args: any = yargs(hideBin(process.argv)).option('numKeys', {
  describe: 'number of private keys to generate',
  number: true,
  demandOption: true,
}).argv

const main = async () => {
  for (let x = 0; x < args.numKeys; x++) {
    const id = await keys.generateKeyPair('secp256k1')
    console.log(bytesToHex(id.raw))
  }
}

void main()
