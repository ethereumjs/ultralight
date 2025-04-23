import { hexToBytes, isHexString, isValidAddress } from '@ethereumjs/util'
import { APPROVED_METHODS } from './constants/methodRegistry'

import { InputValue } from './types'
import { MethodConfig } from '@/services/portalNetwork/types'
import { ENR } from '@chainsafe/enr'

export type MethodType = (typeof APPROVED_METHODS)[number]

export const methodRegistry: Record<MethodType, MethodConfig> = {
  eth_getBlockByHash: {
    name: 'Get Block By Hash',
    paramPlaceholder: 'Enter Block Hash',
    handler: (
      input: string,
      sendRequestHandle: (method: string, params?: any[]) => Promise<any>,
    ) => {
      const [hash, includeFullTx] = input.split(',') as [InputValue, boolean]
      if (!isHexString(hash as `0x${string}`, 32)) {
        throw new Error('Invalid block hash. It should be a valid 32-byte hex string.')
      }
      return sendRequestHandle('eth_getBlockByHash', [
        hexToBytes(hash as `0x${string}`),
        includeFullTx,
      ])
    },
  },
  eth_getBlockByNumber: {
    name: 'Get Block By Number',
    paramPlaceholder: 'Enter Block Number',
    handler: (
      input: string,
      sendRequestHandle: (method: string, params?: any[]) => Promise<any>,
    ) => {
      const [blockNumber, includeFullTx] = input.split(',')
      if (Number.isNaN(Number(blockNumber))) {
        throw new Error('Invalid block number. It should be a valid number.')
      }
      return sendRequestHandle('eth_getBlockByNumber', [blockNumber, includeFullTx])
    },
  },
  eth_getTransactionCount: {
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
  eth_getBalance: {
    name: 'Get Balance Of An Address',
    paramPlaceholder: 'Enter Address',
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
  
      const [address, blockHeight] = input.split(',')
      if (!isValidAddress(address)) {
        throw new Error('Invalid address. It should be a valid 20-byte hex string.')
      }
      return sendRequestHandle('eth_getBalance', [hexToBytes(address), blockHeight])
    },
  },
  portal_historyPing: {
    name: 'Ping a node',
    paramPlaceholder: 'Enter node enr',
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
  
      const enr = input.split(',')
      .filter(enr => enr.trim())
      .map(enr => ENR.decodeTxt(enr))
      
      return sendRequestHandle('portal_historyPing', enr)
    },
  },
  portal_historyFindContent: {
    name: 'Find Content',
    paramPlaceholder: 'Enter enr',
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
  
      let parts = input.split(',')
      const nodeId = parts[0]
      const enr = ENR.decodeTxt(nodeId)
      const contentKey = parts[1]
      
      return sendRequestHandle('portal_historyFindContent', [enr, contentKey])
    },
  },
  portal_historyFindNodes: {
    name: "Find Node",
    paramPlaceholder: "Enter enr",
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
      let parts = input.split(',')
      const nodeId = parts[0]
      const enr = ENR.decodeTxt(nodeId)
      const distances = parts.slice(1)
      return sendRequestHandle('portal_historyFindNodes', [enr, distances])
    },
  },

}