import { useState, useCallback } from 'react'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { formatBlockResponse } from 'portalnetwork'
interface RPCResponse {
  result?: any
  error?: {
    code: number
    message: string
  }
}

export const useJsonRpc = () => {
  const { client, setIsLoading } = usePortalNetwork()
  const [result, setResult] = useState<RPCResponse | null>(null)

  const sendRequestHandle = useCallback(async (method: string, params: any[] = []) => {
    setResult(null)

    if (!client) {
      throw new Error('Portal Network client is not initialized')
    }

    try {
      setIsLoading(true)
      let result
      switch (method) { 
        case 'eth_getBlockByNumber':      
          result = await client.ETH.getBlockByNumber(params[0], params[1] ?? false)
          break
        case 'eth_getBlockByHash':
          result = await client.ETH.getBlockByHash(params[0], params[1] ?? false)
          break
        case 'eth_getTransactionCount':
        result = await client.ETH.getTransactionCount(params[0], true)
        break
        case 'eth_getCode':
          result = await client.ETH.getCode(params[0], params[1])
          break
        case 'eth_getStorageAt':
          result = await client.ETH.getStorageAt(params[0], params[1], params[2])
          break
        case 'eth_call':
          result = await client.ETH.call(params[0], params[1])
          break
        case 'eth_getBalance':
          result = await client.ETH.getBalance(params[0], params[1])
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
      if (result === undefined) {
        throw new Error('No result returned from the request')
      }
      console.log('resultt', result)
      setResult({ result: formatBlockResponse(result, params[1] ?? false) })
      return result
    } catch (err) {

      const message = err instanceof Error 
        ? err.message 
        : 'An unknown error occurred'
      
      setIsLoading(false)
      setResult({ error: { 
        code: -32000, 
        message 
      }})
      
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [client])

  return {
    result,
    setResult,
    sendRequestHandle
  }
}