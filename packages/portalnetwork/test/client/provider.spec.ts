import tape from 'tape'
import { UltralightProvider } from '../../src/client/provider.js'
import { TransportLayer } from '../../src/index.js'

tape('Test provider functionality', async (t) => {
  const provider = new UltralightProvider('https://cloudflare-eth.com/v1/mainnet', 1, {
    proxyAddress: 'http://127.0.0.1:5050',
    transport: TransportLayer.WEB,
  })
  await provider.init()
  const block = await provider.getBlock('latest')

  t.ok(block.number > 0, 'retrieved block from fallback provider')
  t.pass('was able to instantiate a provider')
  t.end()
})
