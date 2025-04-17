import { useState, useCallback } from 'react'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { formatBlockResponse } from 'portalnetwork'
interface RPCResponse {
  result?: any
  error?: {
    code: number
    message: string
  }
  responseType?: 'block' | 'bigNumber' | 'code' | 'storage' | 'callResult' | 'ether'
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
      let responseType: RPCResponse['responseType']

      switch (method) { 
        case 'eth_getBlockByNumber':
          result = await client.ETH.getBlockByNumber(params[0], params[1])
          responseType = 'block'
          break
        case 'eth_getBlockByHash':
          result = await client.ETH.getBlockByHash(params[0], params[1])
          responseType = 'block'
          break
        case 'eth_getTransactionCount':
        result = await client.ETH.getTransactionCount(params[0], params[1])
        responseType = 'bigNumber'
        break
        case 'eth_getCode':
          result = await client.ETH.getCode(params[0], params[1])
          responseType = 'code'
          break
        case 'eth_getStorageAt':
          result = await client.ETH.getStorageAt(params[0], params[1], params[2])
          responseType = 'storage'
          break
        case 'eth_call':
          result = await client.ETH.call(params[0], params[1])
          responseType = 'callResult'
          break
        case 'eth_getBalance':
          result = await client.ETH.getBalance(params[0], params[1])
          responseType = 'ether'
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
      if (result === undefined) {
        throw new Error('No result returned from the request')
      }
      switch (responseType) {
        case 'block':
          setResult({ 
            result: formatBlockResponse(result, params[1]),
            responseType 
          })
          break
        case 'bigNumber':
          setResult({ 
            result: Number(result),
            responseType 
          })
          break
        case 'ether':
          setResult({
            result: Number(BigInt(result) / BigInt(1e18)),
            responseType 
          })
          break
        case 'code':
        case 'storage':
        case 'callResult':
          setResult({ 
            result,
            responseType 
          })
          break
        default:
          setResult({ result })
      }
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