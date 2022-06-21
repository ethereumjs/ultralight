import * as PeerId from 'peer-id'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const args: any = yargs(hideBin(process.argv))
    .option('numKeys', {
        descrbie: 'number of private keys to generate',
        number: true,
        demandOption: true
    }).argv

const main = async () => {
    for (let x = 0; x < args.numKeys; x++) {
        const id = PeerId.create({ 'keyType': 'secp256k1' })
        console.log((await id).toJSON().privKey)
    }
}

main()