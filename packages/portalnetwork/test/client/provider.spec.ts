import { SignableENR } from '@chainsafe/enr'
import { Block, BlockHeader } from '@ethereumjs/block'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, describe, expect, it } from 'vitest'

import { UltralightProvider } from '../../src/client/provider.js'
import { TransportLayer } from '../../src/index.js'
import { NetworkId } from '../../src/networks/types.js'
import { hexToBytes } from 'ethereum-cryptography/utils'
import { bytesToHex, bytesToUnprefixedHex } from '@ethereumjs/util'

describe('Test provider functionality', () => {
  it('should test provider API', async () => {
    const ma = multiaddr('/ip4/0.0.0.0/udp/1500')
    const privateKey = await keys.generateKeyPair('secp256k1')
    const enr = SignableENR.createFromPrivateKey(privateKey)
    enr.setLocationMultiaddr(ma)
    const provider = await UltralightProvider.create({
      bindAddress: '0.0.0.0.0',
      transport: TransportLayer.NODE,
      config: {
        bindAddrs: {
          ip4: ma,
        },
        enr,
        privateKey,
      },
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.StateNetwork },
      ],
      bootnodes: [],
    })

    // Stub getBlockByHash for unit testing
    provider.portal.ETH.getBlockByHash = async (_hash: Uint8Array) => {
      return Block.fromBlockData({ header: BlockHeader.fromHeaderData({ number: 2n }) })
    }

    provider.portal.ETH.getBlockByNumber = async (
      blockNumber: number | bigint | 'latest' | 'finalized',
    ) => {
      return Block.fromBlockData({
        header: BlockHeader.fromHeaderData({
          number: typeof blockNumber === 'string' ? 0n : blockNumber,
        }),
      })
    }

    provider.portal.ETH.getTransactionCount = async (_address: Uint8Array) => {
      return BigInt('0x5')
    }

    provider.portal.ETH.getCode = async (_address: Uint8Array) => {
      return hexToBytes('0x60806040')
    }

    provider.portal.ETH.getBalance = async (_address: Uint8Array) => {
      return 1000000000000000000n
    }

    provider.portal.ETH.getStorageAt = async (_address: Uint8Array, _position: Uint8Array) => {
      const result = new Uint8Array(32)
      result[30] = 0x00
      result[31] = 0x01
      return bytesToUnprefixedHex(result)
    }

    provider.portal.ETH.call = async (_txObject: any) => {
      return bytesToUnprefixedHex(new Uint8Array([0x00, 0x01]))
    }

    const blockByHash = (await provider.request({
      method: 'eth_getBlockByHash',
      params: ['0x123', false],
    })) as { result: { number: string } }
    expect(blockByHash.result.number).toBe('0x2')

    const blockByNumber = (await provider.request({
      method: 'eth_getBlockByNumber',
      params: [100, false],
    })) as { result: { number: string } }
    expect(blockByNumber.result.number).toBe('0x64')

    const balance = (await provider.request({
      method: 'eth_getBalance',
      params: ['0x3DC00AaD844393c110b61aED5849b7c82104e748', '0x0'],
    })) as { result: string }
    expect(balance.result).toBe('0xde0b6b3a7640000')

    const storage = (await provider.request({
      method: 'eth_getStorageAt',
      params: [
        '0x1234567890123456789012345678901234567890',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x64',
      ],
    })) as { result: string }
    expect(storage.result).toBe('0x' + '00'.repeat(30) + '0001')

    const call = (await provider.request({
      method: 'eth_call',
      params: [
        {
          to: '0x1234567890123456789012345678901234567890',
          data: '0x70a08231000000000000000000000000',
        },
        '0x64',
      ],
    })) as { result: string }
    expect(call.result).toBe('0x0001')

    await expect(
      provider.request({
        method: 'eth_unsupportedMethod',
        params: [],
      }),
    ).rejects.toThrow()

    await expect(
      provider.request({
        method: 'eth_getBlockByHash',
        params: ['0x123'],
      }),
    ).resolves.toEqual({
      error: {
        code: -32602,
        message: 'Invalid params for eth_getBlockByHash',
      },
      id: null,
      jsonrpc: '2.0',
    })

    await provider.portal.stop()
  })
  it('should instantiate provider with default network settings', async () => {
    const provider = await UltralightProvider.create({})
    assert.ok(provider.portal.bootnodes.length > 0)
    assert.ok(provider.portal.discv5.bindAddrs[0].toString().includes('0.0.0.0'))
  })
})
