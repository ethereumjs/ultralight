import { hexToBytes, toHex } from 'viem'

export const APPROVED_METHODS = [
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'portal_findNodes',
  'eth_getBlockReceipts',
  'eth_getLogs',
] as const;

export type MethodType = typeof APPROVED_METHODS[number];

interface MethodConfig {
  name: string;
  paramPlaceholder: string;
  handler: (value: string, sendRequest: Function) => void;
}

export const methodRegistry: Record<MethodType, MethodConfig> = {
  'eth_getBlockByHash': {
    name: 'Get Block By Hash',
    paramPlaceholder: 'Enter Block Hash',
    handler: (hash: string, sendRequest: Function) => {
      sendRequest('eth_getBlockByHash', [hexToBytes(`0x${hash}`)]);
    }
  },
  'eth_getBlockByNumber': {
    name: 'Get Block By Number',
    paramPlaceholder: 'Enter Block Number',
    handler: (number: string, sendRequest: Function) => {
      sendRequest('eth_getBlockByNumber', [number]);
    }
  },
  'portal_findNodes': {
    name: 'Find Nodes',
    paramPlaceholder: 'Enter Node ID',
    handler: (nodeId: string, sendRequest: Function) => {
      sendRequest('portal_findNodes', [toHex(nodeId)]);
    }
  },
  'eth_getBlockReceipts': {
    name: 'Get Block Receipts',
    paramPlaceholder: 'Enter Block Hash',
    handler: (hash: string, sendRequest: Function) => {
      sendRequest('eth_getBlockReceipts', [hexToBytes(`0x${hash}`)]);
    }
  },
  'eth_getLogs': {
    name: 'Get Logs',
    paramPlaceholder: 'Enter Block Hash',
    handler: (hash: string, sendRequest: Function) => {
      sendRequest('eth_getLogs', [hexToBytes(`0x${hash}`)]);
    }
  }
};