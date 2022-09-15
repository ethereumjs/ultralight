import tape from 'tape'
import { UltralightProvider } from '../../src/client/provider.js'
import { TransportLayer } from '../../src/index.js'
import { spawn } from 'child_process'
import { createRequire } from 'module'
import { MockProvider } from '../testUtils/mockProvider.js'
import { Block, BlockHeader } from '@ethereumjs/block'
const require = createRequire(import.meta.url)

function getProxy() {
  process.chdir('../')
  const proxyAddr = process.cwd() + '/proxy/dist/index.js'
  process.chdir('./portalnetwork')
  return proxyAddr
}

tape('Test provider functionality', async (t) => {
  const file = require.resolve(getProxy())
  const child = spawn(process.execPath, [file, `--nat=localhost`])
  const sleep = async () => {
    return new Promise((resolve) => setTimeout(resolve, 1000))
  }

  await sleep()
  const provider = new UltralightProvider(new MockProvider(), 1, {
    proxyAddress: 'ws://127.0.0.1:5050',
    transport: TransportLayer.WEB,
    bootnodes: [
      'enr:-IS4QM12WeTSgjXEFLtVgWblXCoRMDT1PLsNGdUi8rl0H5v3erClE6pD1f9pR7W7OYdfAitaza4pxg0o0X8lDZJl8EMDgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQMZR_0w_3yH2Mf_LArRUVYk0keXD5Ru_ahy6ISkMqu2NIN1ZHCCIyg',
    ],
  })
  await provider.init()

  const block = await provider.getBlock(5000)
  t.ok(block.number === 5000, 'retrieved block from fallback provider')

  // Stub getBlockByHash for unit testing
  ;(provider as any).history.ETH.getBlockByHash = (_hash: string) => {
    return Block.fromBlockData({ header: BlockHeader.fromHeaderData({ number: 2n }) })
  }
  const block2 = await provider.getBlock(
    '0xb495a1d7e6663152ae92708da4843337b958146015a2802f4193a410044698c9'
  )
  t.equal(block2.number, 2, 'got block 2 from portal network')
  await (provider as any).portal.stop()
  child.kill()
  t.end()
})
