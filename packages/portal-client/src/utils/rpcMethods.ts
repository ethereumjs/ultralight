import { MethodConfig } from '@/services/portalNetwork/types'
import { hexToBytes, isHexString, isValidAddress } from '@ethereumjs/util'
import { InputValue } from './types'
import { APPROVED_METHODS } from './constants/methodRegistry'

export type MethodType = typeof APPROVED_METHODS[number]

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
  'eth_getTransactionCount': {
    name: 'Get Transanctions By An Address',
    paramPlaceholder: 'Enter Address',
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
      const [address, blockHeight] = input.split(',')
      if (!isValidAddress(address)) {
        throw new Error('Invalid address. It should be a valid 20-byte hex string.')
      }
      return sendRequestHandle('eth_getTransactionCount', [hexToBytes(address), blockHeight])
    },
  },
  'eth_getBalance': {
    name: 'Get Balance Of An Address',
    paramPlaceholder: 'Enter Address',
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
  
      const [address, blockHeight] = input.split(',')
      if (!isValidAddress(address)) {
        throw new Error('Invalid address. It should be a valid 20-byte hex string.')
      }
      // const blockNumber = 1000
      return sendRequestHandle('eth_getBalance', [hexToBytes(address), blockHeight])
    },
  },
}