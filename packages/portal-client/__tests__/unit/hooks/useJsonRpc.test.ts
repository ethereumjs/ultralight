import { act, renderHook } from '@testing-library/react'
import { formatBlockResponse } from 'portalnetwork'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePortalNetwork } from '../../../src/contexts/PortalNetworkContext'
import { useJsonRpc } from '../../../src/hooks/useJsonRpc'

vi.mock('../../../src/contexts/PortalNetworkContext', () => ({
  usePortalNetwork: vi.fn(),
}))

vi.mock('portalnetwork', () => ({
  formatBlockResponse: vi.fn(),
}))

describe('useJsonRpc', () => {
  const mockSetIsLoading = vi.fn()
  let mockClient: {
    ETH: {
      getBlockByNumber: ReturnType<typeof vi.fn>
      getBlockByHash: ReturnType<typeof vi.fn>
      getCode: ReturnType<typeof vi.fn>
      getStorageAt: ReturnType<typeof vi.fn>
      call: ReturnType<typeof vi.fn>
      getBalance: ReturnType<typeof vi.fn>
    }
  }

  const mockUsePortalNetwork = vi.mocked(usePortalNetwork)
  const mockFormatBlockResponse = vi.mocked(formatBlockResponse)

  beforeEach(() => {
    mockClient = {
      ETH: {
        getBlockByNumber: vi.fn(),
        getBlockByHash: vi.fn(),
        getCode: vi.fn(),
        getStorageAt: vi.fn(),
        call: vi.fn(),
        getBalance: vi.fn(),
      },
    }

    mockUsePortalNetwork.mockReturnValue({
      client: mockClient,
      setIsLoading: mockSetIsLoading,
      isLoading: false,
      initialize: vi.fn(),
      cleanup: vi.fn(),
      isNetworkReady: false,
      abortController: null,
      createAbortController: function (): AbortController {
        throw new Error('Function not implemented.')
      },
      cancelRequest: function (): void {
        throw new Error('Function not implemented.')
      }
    })

    mockFormatBlockResponse.mockImplementation((result, includeTransactions) => ({
      jsonrpc: '2.0',
      id: 1,
      result: {
        number: '0x1',
        hash: '0xabc',
        transactions: includeTransactions
          ? [
              {
                blockHash: '0xabc',
                blockNumber: '0x1',
                from: '0xaddress',
                gas: '0x0',
                gasPrice: '0x0',
                hash: '0xtransactionhash',
                input: '0x',
                nonce: '0x0',
                to: '0xrecipientaddress',
                transactionIndex: '0x0',
                value: '0x0',
                type: '0x0',
                v: '0x1',
                r: '0xsignaturepart',
                s: '0xsignaturepart',
                chainId: '0x1',
                maxFeePerGas: '0x0',
                maxPriorityFeePerGas: '0x0',
                accessList: [],
                maxFeePerBlobGas: '0x0',
                blobVersionedHashes: [],
              },
            ]
          : [],
        // Other block properties
        parentHash: null,
        mixHash: null,
        nonce: null,
        sha3Uncles: null,
        logsBloom: null,
        transactionsRoot: null,
        stateRoot: null,
        receiptsRoot: null,
        miner: null,
        difficulty: null,
        extraData: null,
        size: '0x0',
        gasLimit: null,
        gasUsed: null,
        timestamp: null,
        uncles: [],
        baseFeePerGas: null,
        blobGasUsed: null,
        excessBlobGas: null,
        parentBeaconBlockRoot: null,
        requestsRoot: null,
        withdrawalsRoot: null,
        withdrawals: undefined,
      },
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with null result', () => {
    const { result } = renderHook(() => useJsonRpc())
    expect(result.current.result).toBeNull()
  })

  describe('Successful RPC calls', () => {
    it('should handle eth_getBlockByNumber', async () => {
      const mockBlockData = { number: 1, transactions: [] }
      mockClient.ETH.getBlockByNumber.mockResolvedValue(mockBlockData)

      const { result } = renderHook(() => useJsonRpc())

      await act(async () => {
        await result.current.sendRequestHandle('eth_getBlockByNumber', [1, false])
      })

      expect(mockSetIsLoading).toHaveBeenCalledTimes(2)
      expect(mockClient.ETH.getBlockByNumber).toHaveBeenCalledWith(1, false)
      expect(mockFormatBlockResponse).toHaveBeenCalledWith(mockBlockData, false)
      expect(result.current.result?.result.result).toHaveProperty('number', '0x1')
    })

    it('should handle eth_getBlockByHash', async () => {
      const mockBlockData = { hash: '0xabc', transactions: [] }
      mockClient.ETH.getBlockByHash.mockResolvedValue(mockBlockData)

      const { result } = renderHook(() => useJsonRpc())

      await act(async () => {
        await result.current.sendRequestHandle('eth_getBlockByHash', ['0xabc', true])
      })

      expect(mockClient.ETH.getBlockByHash).toHaveBeenCalledWith('0xabc', true)
      expect(result.current.result?.result.result).toHaveProperty('hash', '0xabc')
    })
  })

  describe('Error handling', () => {
    it('should handle RPC errors', async () => {
      mockClient.ETH.getBlockByNumber.mockRejectedValue(new Error('RPC error'))

      const { result } = renderHook(() => useJsonRpc())

      await act(async () => {
        await expect(
          result.current.sendRequestHandle('eth_getBlockByNumber', ['0x1']),
        ).rejects.toThrow('RPC error')
      })

      expect(result.current.result?.error).toEqual({
        code: -32000,
        message: 'RPC error',
      })
    })

    it('should handle unsupported methods', async () => {
      const { result } = renderHook(() => useJsonRpc())

      await act(async () => {
        await expect(
          result.current.sendRequestHandle('unsupported_method', ['0x1']),
        ).rejects.toThrow('Unsupported method: unsupported_method')
      })

      expect(result.current.result?.error).toEqual({
        code: -32000,
        message: 'Unsupported method: unsupported_method',
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined results', async () => {
      mockClient.ETH.getBlockByNumber.mockResolvedValue(undefined)

      const { result } = renderHook(() => useJsonRpc())

      await act(async () => {
        await expect(
          result.current.sendRequestHandle('eth_getBlockByNumber', ['0x1']),
        ).rejects.toThrow('No result returned from the request')
      })

      expect(result.current.result?.error).toEqual({
        code: -32000,
        message: 'No result returned from the request',
      })
    })

    it('should handle non-Error thrown values', async () => {
      mockClient.ETH.getBlockByNumber.mockRejectedValue('Simple string error')

      const { result } = renderHook(() => useJsonRpc())

      await act(async () => {
        await expect(
          result.current.sendRequestHandle('eth_getBlockByNumber', ['0x1']),
        ).rejects.toThrow('An unknown error occurred')
      })

      expect(result.current.result?.error).toEqual({
        code: -32000,
        message: 'An unknown error occurred',
      })
    })
  })
})
