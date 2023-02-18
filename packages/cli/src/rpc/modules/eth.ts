import { Block } from '@ethereumjs/block'
import { intToHex, toBuffer } from '@ethereumjs/util'
import { Debugger } from 'debug'
import {
  ProtocolId,
  ReceiptsManager,
  HistoryProtocol,
  PortalNetwork,
  getContentKey,
  fromHexString,
  reassembleBlock,
  BlockHeaderWithProof,
} from 'portalnetwork'
import { INTERNAL_ERROR, INVALID_PARAMS } from '../error-code.js'
import { GetLogsParams, jsonRpcLog } from '../types.js'
import { validators, middleware } from '../validators.js'

/**
 * eth_* RPC module
 * @memberof module:rpc/modules
 */
export class eth {
  private _client: PortalNetwork
  private _history: HistoryProtocol
  private logger: Debugger
  private receiptsManager: ReceiptsManager
  /**
   * Create eth_* RPC module
   * @param rpcManager RPC client to which the module binds
   */
  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this._history = client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    this.logger = logger.extend('eth')
    this.receiptsManager = (
      this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    ).receiptManager

    this.getBlockByNumber = middleware(this.getBlockByNumber.bind(this), 2, [
      [validators.blockOption],
      [validators.bool],
    ])

    this.getBlockByHash = middleware(this.getBlockByHash.bind(this), 2, [
      [validators.hex, validators.blockHash],
      [validators.bool],
    ])

    this.getBlockTransactionCountByHash = middleware(
      this.getBlockTransactionCountByHash.bind(this),
      1,
      [[validators.hex, validators.blockHash]]
    )

    this.getUncleCountByBlockNumber = middleware(this.getUncleCountByBlockNumber.bind(this), 1, [
      [validators.hex],
    ])

    this.getUncleCountByBlockNumber = middleware(this.getUncleCountByBlockNumber.bind(this), 1, [
      [validators.hex],
    ])

    this.getLogs = middleware(this.getLogs.bind(this), 1, [
      [
        validators.object({
          fromBlock: validators.optional(validators.blockOption),
          toBlock: validators.optional(validators.blockOption),
          address: validators.optional(
            validators.either(validators.array(validators.address), validators.address)
          ),
          topics: validators.optional(
            validators.array(
              validators.optional(
                validators.either(validators.hex, validators.array(validators.hex))
              )
            )
          ),
          blockHash: validators.optional(validators.blockHash),
        }),
      ],
    ])
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
  async getBlockByHash(params: [string, boolean]) {
    const [blockHash, includeTransactions] = params
    this._client.logger(
      `eth_getBlockByHash request received. blockHash: ${blockHash} includeTransactions: ${includeTransactions}`
    )
    await this._history.ETH.getBlockByHash(blockHash, includeTransactions)
    const headerWithProof = await this._history.findContentLocally(
      fromHexString(getContentKey(0, fromHexString(blockHash)))
    )
    const header = BlockHeaderWithProof.deserialize(headerWithProof).header
    const body = await this._history.findContentLocally(
      fromHexString(getContentKey(1, fromHexString(blockHash)))
    )
    const block = body.length > 0 ? reassembleBlock(header, body) : reassembleBlock(header)

    return block ?? 'Block not found'
  }

  /**
   * Returns information about a block by block number.
   * @param params An array of two parameters:
   *   1. integer of a block number
   *   2. boolean - if true returns the full transaction objects, if false only the hashes of the transactions.
   */
  async getBlockByNumber(params: [string, boolean]) {
    const [blockNumber, includeTransactions] = params
    this.logger(
      `eth_getBlockByNumber request received.  blockNumber: ${blockNumber} includeTransactions: ${includeTransactions}`
    )
    try {
      const block = await this._history.ETH.getBlockByNumber(
        parseInt(blockNumber),
        includeTransactions
      )
      this.logger(block)
      return block ?? 'Block not found'
    } catch {
      return 'Block not found'
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
      block = (await this.getBlockByNumber(['0', true])) as Block
    } else {
      block = (await this.getBlockByNumber([blockOpt, true])) as Block
    }

    return block
  }

  /**
   * Returns the transaction count for a block given by the block hash.
   * @param params An array of one parameter: A block hash
   */
  async getBlockTransactionCountByHash(params: [string]) {
    const [blockHash] = params
    try {
      const block = (await this.getBlockByHash([blockHash, true])) as Block
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
    const block = (await this.getBlockByNumber([blockNumber, true])) as Block
    return block.uncleHeaders.length
  }
  /**
   * Returns an array of all logs matching a given filter object.
   * Only available with `--saveReceipts` enabled
   * @param params An object of the filter options {@link GetLogsParams}
   */
  async getLogs(params: [GetLogsParams]) {
    const { fromBlock, toBlock, blockHash, address, topics } = params[0]
    if (!this.receiptsManager) throw new Error('missing receiptsManager')
    if (blockHash !== undefined && (fromBlock !== undefined || toBlock !== undefined)) {
      throw {
        code: INVALID_PARAMS,
        message: `Can only specify a blockHash if fromBlock or toBlock are not provided`,
      }
    }
    let from: Block, to: Block
    if (blockHash) {
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
    if (
      Number(to.header.number) - Number(from.header.number) >
      this.receiptsManager.GET_LOGS_BLOCK_RANGE_LIMIT
    ) {
      throw {
        code: INVALID_PARAMS,
        message: `block range limit is ${this.receiptsManager.GET_LOGS_BLOCK_RANGE_LIMIT} blocks`,
      }
    }
    try {
      const formattedTopics = topics?.map((t) => {
        if (t === null) {
          return null
        } else if (Array.isArray(t)) {
          return t.map((x) => toBuffer(x))
        } else {
          return toBuffer(t)
        }
      })
      let addrs
      if (address) {
        if (Array.isArray(address)) {
          addrs = address.map((a) => toBuffer(a))
        } else {
          addrs = [toBuffer(address)]
        }
      }
      const logs = await this.receiptsManager.getLogs(from, to, addrs, formattedTopics)
      return await Promise.all(
        logs.map(({ log, block, tx, txIndex, logIndex }) =>
          jsonRpcLog(log, block, tx, txIndex, logIndex)
        )
      )
    } catch (error: any) {
      throw {
        code: INTERNAL_ERROR,
        message: error.message.toString(),
      }
    }
  }
}
