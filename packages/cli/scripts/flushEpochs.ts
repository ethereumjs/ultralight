import { bytesToHex } from '@ethereumjs/util'
import jayson from 'jayson/promise/index.js'

const { Client } = jayson

const main = async () => {
  const ultralights: jayson.HttpClient[] = []
  const enrs: string[] = []
  const nodeIds: string[] = []
  for (let i = 0; i < 8; i++) {
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 + i })
    ultralights.push(ultralight)
  }
  for (const ultralight of ultralights) {
    const ultralightENR = await ultralight.request('portal_historyNodeInfo', [])
    enrs.push(ultralightENR.result.enr)
    nodeIds.push(ultralightENR.result.nodeId)
    const deleted = await ultralight.request('ultralight_flushEpochs', [])
    console.log(`Deleted ${deleted.length} epochs`)
    for (const [i, epoch] of deleted.entries()) {
      console.log(i, `Deleted epoch ${bytesToHex(epoch)}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
