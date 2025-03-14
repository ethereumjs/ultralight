import { hexToBytes, toHex } from 'viem'
import { APPROVED_METHODS } from '@/services/portalNetwork/types'

export type MethodType = typeof APPROVED_METHODS[number]

interface MethodConfig {
  name: string
  paramPlaceholder: string
  handler: (
    value: string, 
    sendRequest: (method: string, params?: any[])
    => Promise<any>) => void | Promise<any>
}

export const methodRegistry: Record<MethodType, MethodConfig> = {
  'eth_getBlockByHash': {
    name: 'Get Block By Hash',
    paramPlaceholder: 'Enter Block Hash',
    handler: (hash: string, sendRequest: Function) => {
      sendRequest('eth_getBlockByHash', [hexToBytes(`0x${hash}`)])
    },
  },
  'eth_getBlockByNumber': {
    name: 'Get Block By Number',
    paramPlaceholder: 'Enter Block Number',
    handler: (input: string, sendRequestHandle: (method: string, params?: any[]) => Promise<any>) => {
      const [blockNumber, includeFullTx = false] = input.split(',')
      return sendRequestHandle('eth_getBlockByNumber', [blockNumber, includeFullTx])
    },
  },
  'portal_findNodes': {
    name: 'Find Nodes',
    paramPlaceholder: 'Enter Node ID',
    handler: (nodeId: string, sendRequest: Function) => {
      sendRequest('portal_findNodes', [toHex(nodeId)])
    },
  },
  'eth_getBlockReceipts': {
    name: 'Get Block Receipts',
    paramPlaceholder: 'Enter Block Hash',
    handler: (hash: string, sendRequest: Function) => {
      sendRequest('eth_getBlockReceipts', [hexToBytes(`0x${hash}`)])
    },
  },
  'eth_getLogs': {
    name: 'Get Logs',
    paramPlaceholder: 'Enter Block Hash',
    handler: (hash: string, sendRequest: Function) => {
      sendRequest('eth_getLogs', [hexToBytes(`0x${hash}`)])
    },
  }
}