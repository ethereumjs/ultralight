import { PortalNetwork } from './client.js'

import type { PortalNetworkOpts } from './types'
import { hexToBytes } from '@ethereumjs/util'

import { formatBlockResponse } from '../util/helpers.js'

const ERROR_CODES = {
  UNSUPPORTED_METHOD: 4200,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
}

const SUPPORTED_METHODS = new Set([
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getTransactionCount',
  'eth_getCode',
  'eth_getBalance',
  'eth_getStorageAt',
  'eth_call',
])

interface RequestArguments {
  method: string
  params?: unknown[]
}

export class UltralightProvider {
  public portal: PortalNetwork

  constructor(portal: PortalNetwork) {
    this.portal = portal
  }

  static async create(opts: Partial<PortalNetworkOpts>): Promise<UltralightProvider> {
    const portal = await PortalNetwork.create(opts)
    return new UltralightProvider(portal)
  }

  async request({ method, params = [] }: RequestArguments): Promise<unknown> {
    if (!SUPPORTED_METHODS.has(method)) {
      throw this.createError(
        ERROR_CODES.UNSUPPORTED_METHOD,
        `The Provider does not support the requested method`,
      )
    }

    try {
      switch (method) {
        case 'eth_getBlockByHash': {
          if (params.length !== 2)
            throw this.createError(
              ERROR_CODES.INVALID_PARAMS,
              'Invalid params for eth_getBlockByHash',
            )
          const [blockHash, fullTx] = params
          return await this.getBlockByHash(hexToBytes(blockHash as string), fullTx as boolean)
        }

        case 'eth_getBlockByNumber': {
          if (params.length !== 2)
            throw this.createError(
              ERROR_CODES.INVALID_PARAMS,
              'Invalid params for eth_getBlockByNumber',
            )

          const [blockNumber, includeTx] = params
          if (
            typeof blockNumber !== 'number' &&
            typeof blockNumber !== 'bigint' &&
            blockNumber !== 'latest' &&
            blockNumber !== 'finalized'
          ) {
            throw this.createError(
              ERROR_CODES.INVALID_PARAMS,
              `Invalid block number: ${blockNumber}`,
            )
          }
          return await this.getBlockByNumber(blockNumber, includeTx as boolean)
        }

        case 'eth_getTransactionCount': {
          if (params.length !== 2)
            throw this.createError(
              ERROR_CODES.INVALID_PARAMS,
              'Invalid params for eth_getTransactionCount',
            )
          const [address, block] = params
          return await this.getTransactionCount(address as string, block as string)
        }

        case 'eth_getCode': {
          if (params.length !== 2)
            throw this.createError(ERROR_CODES.INVALID_PARAMS, 'Invalid params for eth_getCode')
          const [codeAddress, codeBlock] = params
          return await this.getCode(codeAddress as string, codeBlock as string)
        }

        case 'eth_getBalance': {
          if (params.length !== 2)
            throw this.createError(ERROR_CODES.INVALID_PARAMS, 'Invalid params for eth_getBalance')
          const [balanceAddress, balanceBlock] = params
          return await this.getBalance(balanceAddress as string, balanceBlock as bigint)
        }

        case 'eth_getStorageAt': {
          if (params.length !== 3)
            throw this.createError(
              ERROR_CODES.INVALID_PARAMS,
              'Invalid params for eth_getStorageAt',
            )
          const [storageAddress, position, storageBlock] = params
          return await this.getStorageAt(
            storageAddress as string,
            position as string,
            storageBlock as string,
          )
        }

        case 'eth_call': {
          if (params.length !== 2)
            throw this.createError(ERROR_CODES.INVALID_PARAMS, 'Invalid params for eth_call')
          const [callObject, callBlock] = params
          return await this.call(callObject as any, callBlock as bigint)
        }

        default:
          throw this.createError(
            ERROR_CODES.UNSUPPORTED_METHOD,
            `The Provider does not support the requested method`,
          )
      }
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: error.code ?? ERROR_CODES.INTERNAL_ERROR,
          message: error.message ?? 'Internal error',
        },
      }
    }
  }

  private async getBlockByHash(blockHash: Uint8Array, fullTx: boolean) {
    const response = await this.portal.ETH.getBlockByHash(blockHash, fullTx)
    if (!response) {
      throw this.createError(ERROR_CODES.INTERNAL_ERROR, 'Block not found')
    }

    return formatBlockResponse(response, fullTx)
  }

  private async getBlockByNumber(blockNumber: string | number | bigint, includeTx: boolean) {
    let block

    if (typeof blockNumber === 'string') {
      if (blockNumber === 'latest' || blockNumber === 'finalized') {
        block = await this.portal.ETH.getBlockByNumber(blockNumber, includeTx)
      } else {
        block = await this.portal.ETH.getBlockByNumber(BigInt(blockNumber), includeTx)
      }
    } else {
      block = await this.portal.ETH.getBlockByNumber(blockNumber, includeTx)
    }

    if (!block) {
      throw this.createError(ERROR_CODES.INTERNAL_ERROR, 'Block not found')
    }

    return formatBlockResponse(block, includeTx)
  }

  private async getTransactionCount(address: string, block: string) {
    return this.portal.ETH.getTransactionCount(hexToBytes(address), block)
  }

  private async getCode(codeAddress: string, codeBlock: string) {
    return this.portal.ETH.getCode(hexToBytes(codeAddress), codeBlock)
  }

  private async getBalance(balanceAddress: string, balanceBlock: bigint) {
    return this.portal.ETH.getBalance(hexToBytes(balanceAddress), balanceBlock)
  }

  private async getStorageAt(storageAddress: string, position: string, storageBlock: string) {
    return this.portal.ETH.getStorageAt(
      hexToBytes(storageAddress),
      hexToBytes(position),
      storageBlock,
    )
  }

  private async call(callObject: any, callBlock: bigint) {
    return this.portal.ETH.call(callObject, callBlock)
  }

  private createError(code: number, message: string) {
    const error = new Error(message)
    ;(error as any).code = code
    return error
  }
}
