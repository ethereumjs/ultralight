import tape from 'tape'
import { ethers } from 'ethers'
import { UltralightProvider } from '../../src/client/provider.js'
import { ENR, TransportLayer } from '../../src/index.js'
import { MockProvider } from '../testUtils/mockProvider.js'
import { Block, BlockHeader } from '@ethereumjs/block'
import { Multiaddr } from '@multiformats/multiaddr'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'

tape('Test provider functionality', async (t) => {
  const ma = new Multiaddr('/ip4/0.0.0.0/udp/1500')
  const peerId = await createSecp256k1PeerId()
  const enr = ENR.createFromPeerId(peerId)
  enr.setLocationMultiaddr(ma)
  const provider = await UltralightProvider.create(new MockProvider(), 1, {
    bindAddress: '0.0.0.0',
    transport: TransportLayer.NODE,
    config: {
      multiaddr: ma,
      enr: enr,
      peerId: peerId,
    },
  })

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

  t.equal(1, (await provider.detectNetwork()).chainId, 'parent class methods work as expected')
  t.end()
})

tape.only('Test block storage', async (t) => {
  const ma = new Multiaddr('/ip4/0.0.0.0/udp/1500')
  const peerId = await createSecp256k1PeerId()
  const enr = ENR.createFromPeerId(peerId)
  enr.setLocationMultiaddr(ma)
  const provider = await UltralightProvider.create(new ethers.providers.CloudflareProvider(), 1, {
    bindAddress: '0.0.0.0',
    transport: TransportLayer.NODE,
    config: {
      multiaddr: ma,
      enr: enr,
      peerId: peerId,
    },
  })

  const block = await provider.getBlockWithTransactions('latest')
  console.log(block)
  t.end()
})
