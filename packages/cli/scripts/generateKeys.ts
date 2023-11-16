import { createSecp256k1PeerId, exportToProtobuf } from '@libp2p/peer-id-factory'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { toHexString } from '../../portalnetwork/dist/index.js'

const args: any = yargs(hideBin(process.argv)).option('numKeys', {
  describe: 'number of private keys to generate',
  number: true,
  demandOption: true,
}).argv

const main = async () => {
  for (let x = 0; x < args.numKeys; x++) {
    const id = await createSecp256k1PeerId()
    console.log(toHexString(exportToProtobuf(id)))
  }
}

void main()
