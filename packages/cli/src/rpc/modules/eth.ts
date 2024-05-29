import { bigIntToHex, intToHex, toBytes } from '@ethereumjs/util'
import { GET_LOGS_BLOCK_RANGE_LIMIT, NetworkId, getLogs } from 'portalnetwork'

import { INTERNAL_ERROR, INVALID_PARAMS } from '../error-code.js'
import { jsonRpcLog } from '../types.js'
import { callWithStackTrace } from '../util.js'
import { middleware, validators } from '../validators.js'

import type { GetLogsParams } from '../types.js'
import type { Block } from '@ethereumjs/block'
import type { Debugger } from 'debug'
import type { HistoryNetwork, PortalNetwork, RpcTx } from 'portalnetwork'

/**
 * eth_* RPC module
 * @memberof module:rpc/modules
 */
export class eth {
  private _client: PortalNetwork
  private _history: HistoryNetwork
  private logger: Debugger
  /**
   * Create eth_* RPC module
   * @param rpcManager RPC client to which the module binds
   */
  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this._history = client.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    this.logger = logger.extend('eth')

    this.getBlockByNumber = middleware(
      callWithStackTrace(this.getBlockByNumber.bind(this), true),
      2,
      [[validators.blockOption], [validators.bool]],
    )

    this.getBlockByHash = middleware(callWithStackTrace(this.getBlockByHash.bind(this), false), 2, [
      [validators.hex, validators.blockHash],
      [validators.bool],
    ])

    this.getBlockTransactionCountByHash = middleware(
      callWithStackTrace(this.getBlockTransactionCountByHash.bind(this), true),
      1,
      [[validators.hex, validators.blockHash]],
    )

    this.getUncleCountByBlockNumber = middleware(
      callWithStackTrace(this.getUncleCountByBlockNumber.bind(this), false),
      1,
      [[validators.hex]],
    )

    this.getUncleCountByBlockNumber = middleware(
      callWithStackTrace(this.getUncleCountByBlockNumber.bind(this), false),
      1,
      [[validators.hex]],
    )

    this.getLogs = middleware(callWithStackTrace(this.getLogs.bind(this), false), 1, [
      [
        validators.object({
          fromBlock: validators.optional(validators.blockOption),
          toBlock: validators.optional(validators.blockOption),
          address: validators.optional(
            validators.either(validators.array(validators.address), validators.address),
          ),
          topics: validators.optional(
            validators.array(
              validators.optional(
                validators.either(validators.hex, validators.array(validators.hex)),
              ),
            ),
          ),
          blockHash: validators.optional(validators.blockHash),
        }),
      ],
    ])

    this.getBalance = middleware(callWithStackTrace(this.getBalance.bind(this), false), 2, [
      [validators.address],
      [validators.blockOption],
    ])
    this.call = middleware(callWithStackTrace(this.call.bind(this), false), 2, [
      [validators.transaction(['to'])],
      [validators.blockOption],
    ])
  }

  async getBalance(params: [string, string]) {
    const [address, blockTag] = params
    try {
      const res = await this._client.ETH.ethGetBalance(address, BigInt(blockTag))
      if (res === undefined) {
        return '0x0'
      }
      return bigIntToHex(res)
    } catch (err: any) {
      console.log(err)
      throw {
        code: INTERNAL_ERROR,
        message: err.message,
      }
    }
  }

  async call(params: [RpcTx, string]) {
    const [tx, blockTag] = params
    try {
      const res = await this._client.ETH.ethCall(tx, BigInt(blockTag))
      return res
    } catch (err: any) {
      console.log(err)
      throw {
        code: INTERNAL_ERROR,
        message: err.message,
      }
    }
  }
  /**
   * Returns the currently configured chain id, a value used in replay-protected transaction signing as introduced by EIP-155.
   * @param _params An empty array
   * @returns The chain ID.
   */
  async chainId(_params = []) {
    return '0x01'
  }

  /**
   * Returns information about a block by hash.
   * @param params An array of two parameters:
   *   1. a block hash
   *   2. boolean - if true returns the full transaction objects, if false only the hashes of the transactions.
   */
  async getBlockByHash(params: [string, boolean]): Promise<Block> {
    const [blockHash, includeTransactions] = params
    this._client.logger(
      `eth_getBlockByHash request received. blockHash: ${blockHash} includeTransactions: ${includeTransactions}`,
    )
    const block = await this._history.ETH.getBlockByHash(blockHash, includeTransactions)
    //@ts-ignore @ethereumjs/block has some weird typing discrepancy
    if (block !== undefined) return block
    throw new Error('Block not found')
  }

  /**
   * Returns information about a block by block number.
   * @param params An array of two parameters:
   *   1. integer of a block number
   *   2. boolean - if true returns the full transaction objects, if false only the hashes of the transactions.
   */
  async getBlockByNumber(params: [string, boolean]): Promise<Block> {
    const [blockNumber, includeTransactions] = params
    this.logger(
      `eth_getBlockByNumber request received.  blockNumber: ${blockNumber} includeTransactions: ${includeTransactions}`,
    )
    try {
      const block = await this._client.ETH.getBlockByNumber(
        parseInt(blockNumber),
        includeTransactions,
      )
      if (block === undefined) throw new Error('block not found')

      return block
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  /**
   * Get block by option
   */
  getBlockByOption = async (blockOpt: string) => {
    if (blockOpt === 'pending') {
      throw {
        code: INVALID_PARAMS,
        message: `"pending" is not yet supported`,
      }
    }

    let block: Block

    if (blockOpt === 'latest') {
      throw new Error(`History Network does not support "latest" block`)
    } else if (blockOpt === 'earliest') {
      block = await this.getBlockByNumber(['0', true])
    } else {
      block = await this.getBlockByNumber([blockOpt, true])

      return block
    }
  }

  /**
   * Returns the transaction count for a block given by the block hash.
   * @param params An array of one parameter: A block hash
   */
  async getBlockTransactionCountByHash(params: [string]) {
    const [blockHash] = params
    try {
      const block = await this.getBlockByHash([blockHash, true])
      return intToHex(block.transactions.length)
    } catch (error) {
      throw {
        code: INVALID_PARAMS,
        message: 'Unknown block',
      }
    }
  }

  /**
   * Returns the number of uncles in a block from a block matching the given block number
   * @param params An array of one parameter:
   *   1: hexadecimal representation of a block number
   */
  async getUncleCountByBlockNumber(params: [string]) {
    const [blockNumber] = params
    const block = await this.getBlockByNumber([blockNumber, true])
    return block.uncleHeaders.length
  }
  /**
   * Returns an array of all logs matching a given filter object.
   * Only available with `--saveReceipts` enabled
   * @param params An object of the filter options {@link GetLogsParams}
   */
  async getLogs(params: [GetLogsParams]) {
    const { fromBlock, toBlock, blockHash, address, topics } = params[0]
    if (blockHash !== undefined && (fromBlock !== undefined || toBlock !== undefined)) {
      throw {
        code: INVALID_PARAMS,
        message: `Can only specify a blockHash if fromBlock or toBlock are not provided`,
      }
    }
    let from: Block, to: Block
    if (blockHash !== undefined) {
      try {
        from = to = (await this.getBlockByHash([blockHash, true])) as Block
      } catch (error: any) {
        throw {
          code: INVALID_PARAMS,
          message: 'unknown blockHash',
        }
      }
    } else {
      if (fromBlock === 'earliest') {
        from = (await this.getBlockByNumber(['0', true])) as Block
      } else if (fromBlock === 'latest' || fromBlock === undefined) {
        throw new Error(`History Network does not support "latest" block`)
      } else {
        const blockNum = BigInt(fromBlock)
        from = (await this.getBlockByNumber([blockNum.toString(), true])) as Block
      }
      if (toBlock === fromBlock) {
        to = from
      } else {
        throw new Error(`unsupported toBlock: ${toBlock}`)
      }
    }
    if (Number(to.header.number) - Number(from.header.number) > GET_LOGS_BLOCK_RANGE_LIMIT) {
      throw {
        code: INVALID_PARAMS,
        message: `block range limit is ${GET_LOGS_BLOCK_RANGE_LIMIT} blocks`,
      }
    }
    try {
      const formattedTopics = topics?.map((t) => {
        if (t === null) {
          return null
        } else if (Array.isArray(t)) {
          return t.map((x) => toBytes(x))
        } else {
          return toBytes(t)
        }
      })
      let addrs
      if (address !== undefined) {
        if (Array.isArray(address)) {
          addrs = address.map((a) => toBytes(a))
        } else {
          addrs = [toBytes(address)]
        }
      }
      const blocks = Promise.all(
        Array.from(
          { length: Number(to.header.number) - Number(from.header.number) + 1 } as any,
          async (_, i) =>
            (await this.getBlockByNumber([
              bigIntToHex(BigInt(i) + from.header.number),
              true,
            ])) as Block,
        ),
      ) //@ts-ignore
      const logs = await getLogs(await blocks, addrs, formattedTopics)
      return await Promise.all(
        logs.map(
          (
            { log, block, tx, txIndex, logIndex }, //@ts-ignore
          ) => jsonRpcLog(log, block, tx, txIndex, logIndex),
        ),
      )
    } catch (error: any) {
      throw {
        code: INTERNAL_ERROR,
        message: error.message.toString(),
      }
    }
  }
}
