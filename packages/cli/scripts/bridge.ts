import { Block } from '@ethereumjs/block'
import jayson from 'jayson/promise/index.js'
import { toHexString } from 'portalnetwork'

// Bridge node script expects a url string corresponding to an execution node serving the Ethereum JSON-RPC API
const main = async () => {
  process.on('SIGINT', async () => {
    console.log('Caught interrupt signal. Shutting down...')
    process.exit()
  })
  const portal = jayson.Client.http({ port: 8545 })
  //@ts-ignore  jayson types don't match reality where it accepts a url string for a JSON provider
  const web3 = jayson.Client.https(args[2])
  while (true) {
    const res = await web3.request('eth_getBlockByNumber', ['latest', true])
    console.log(
      `Latest block retrieved from execution node - Hash ${res.result.hash} -- Number - ${Number(
        BigInt(res.result.number)
      )}`
    )
    const block = Block.fromRPC(res.result, [], { hardforkByBlockNumber: true })
    const portRes = await portal.request('ultralight_addBlockToHistory', [
      toHexString(block.hash()),
      toHexString(block.serialize()),
    ])
    console.log(portRes.result)
    await new Promise((resolve) => setTimeout(resolve, 12000))
  }
}

main()
