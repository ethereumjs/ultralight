import { SignableENR } from '@chainsafe/enr'
import { Block, BlockHeader } from '@ethereumjs/block'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, it } from 'vitest'

import { UltralightProvider } from '../../src/client/provider.js'
import { TransportLayer } from '../../src/index.js'
import { NetworkId } from '../../src/networks/types.js'

it('Test provider functionality', async () => {
  const ma = multiaddr('/ip4/0.0.0.0/udp/1500')
  const privateKey = await keys.generateKeyPair('secp256k1')
  const enr = SignableENR.createFromPrivateKey(privateKey)
  enr.setLocationMultiaddr(ma)
  const provider = await UltralightProvider.create({
    bindAddress: '0.0.0.0',
    transport: TransportLayer.NODE,
    config: {
      bindAddrs: {
        ip4: ma,
      },
      enr,
      privateKey,
    },
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
  })

  
  // Stub getBlockByHash for unit testing
  provider.portal.ETH.getBlockByHash = async (_hash: Uint8Array) => {
    return Block.fromBlockData({ header: BlockHeader.fromHeaderData({ number: 2n }) })
  }
  
  await (provider as any).portal.stop()

  assert.equal(
    1n,
    (await provider._detectNetwork()).chainId,
    'parent class methods work as expected',
  )
})
