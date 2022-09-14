import tape from 'tape'
import { UltralightProvider } from '../../src/client/provider.js'
import { TransportLayer } from '../../src/index.js'

tape('Test provider functionality', async (t) => {
  const provider = new UltralightProvider('https://cloudflare-eth.com/v1/mainnet', 1, {
    proxyAddress: 'ws://127.0.0.1:5050',
    transport: TransportLayer.WEB,
    bootnodes: [
      'enr:-IS4QM12WeTSgjXEFLtVgWblXCoRMDT1PLsNGdUi8rl0H5v3erClE6pD1f9pR7W7OYdfAitaza4pxg0o0X8lDZJl8EMDgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQMZR_0w_3yH2Mf_LArRUVYk0keXD5Ru_ahy6ISkMqu2NIN1ZHCCIyg',
    ],
  })
  await provider.init()
  const block = await provider.getBlock('latest')
  t.ok(block.number > 0, 'retrieved block from fallback provider')

  const block2 = await provider.getBlock(
    '0xb495a1d7e6663152ae92708da4843337b958146015a2802f4193a410044698c9'
  )
  t.equal(block2.number, 2, 'got block 2 from portal network')
  await (provider as any).portal.stop()
  t.end()
})
