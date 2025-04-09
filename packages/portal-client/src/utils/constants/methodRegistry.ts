import { hexToBytes } from 'viem'
import { APPROVED_METHODS } from '@/services/portalNetwork/types'
import { isHexString } from '@ethereumjs/util'
import { InputValue } from '../types'

export type MethodType = typeof APPROVED_METHODS[number]

interface MethodConfig {
  name: string
  paramPlaceholder: string
  handler: (
    input: string, 
    sendRequest: (method: string, params?: any[])
    => Promise<any>) => void | Promise<any>
}

export const methodRegistry: Record<MethodType, MethodConfig> = {
  'eth_getBlockByHash': {
    name: 'Get Block By Hash',
    paramPlaceholder: 'Enter Block Hash',
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
      const [hash, includeFullTx] = input.split(',') as [InputValue, boolean]
      if (!isHexString(hash as `0x${string}`, 32)) {
        throw new Error('Invalid block hash. It should be a valid 32-byte hex string.')
      }
      return sendRequestHandle('eth_getBlockByHash', [hexToBytes(hash as `0x${string}`), includeFullTx])
    },
  },
  'eth_getBlockByNumber': {
    name: 'Get Block By Number',
    paramPlaceholder: 'Enter Block Number',
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
      const [blockNumber, includeFullTx] = input.split(',')
      if (isNaN(Number(blockNumber))) {
        throw new Error('Invalid block number. It should be a valid number.')
      }
      return sendRequestHandle('eth_getBlockByNumber', [blockNumber, includeFullTx])
    },
  },
}