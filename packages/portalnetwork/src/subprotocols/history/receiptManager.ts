import { TypedTransaction } from '@ethereumjs/tx'
import {
  arrToBufArr,
  bigIntToBuffer,
  bufArrToArr,
  bufferToBigInt,
  bufferToInt,
  intToBuffer,
  NestedUint8Array,
} from '@ethereumjs/util'
import * as RLP from '@ethereumjs/rlp'
import type { Block } from '@ethereumjs/block'
import { DBManager } from '../../client/dbManager.js'
import {
  Bloom,
  HistoryProtocol,
  getHistoryNetworkContentId,
  HistoryNetworkContentTypes,
  Log,
  PostByzantiumTxReceipt,
  PreByzantiumTxReceipt,
  TxReceipt,
  TxReceiptType,
  TxReceiptWithType,
} from '../index.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { VM } from '@ethereumjs/vm'

type _GetReceiptByTxHashReturn = [
  receipt: TxReceipt,
  blockHash: Buffer,
  txIndex: number,
  logIndex: number
]

type GetLogsReturn = {
  log: Log
  block: Block
  tx: TypedTransaction
  txIndex: number
  logIndex: number
}[]

/**
 * Indexes
 */
type TxHashIndex = [blockHash: Buffer, txIndex: number]

/**
 * Storage encodings
 */
type rlpLog = Log
type rlpReceipt = [postStateOrStatus: Buffer, cumulativeGasUsed: Buffer, logs: rlpLog[]]
type rlpTxHash = [blockHash: Buffer, txIndex: Buffer]

export enum RlpConvert {
  Encode,
  Decode,
}
export enum RlpType {
  Receipts,
  Logs,
  TxHash,
}
type rlpOut = Log[] | TxReceipt[] | TxHashIndex

export class ReceiptsManager {
  db: DBManager
  protocol: HistoryProtocol

  constructor(db: DBManager, protocol: HistoryProtocol) {
    this.db = db
    this.protocol = protocol
  }
  /**
   * Limit of logs to return in getLogs
   */
  GET_LOGS_LIMIT = 10000

  /**
   * Size limit for the getLogs response in megabytes
   */
  GET_LOGS_LIMIT_MEGABYTES = 150

  /**
   * Block range limit for getLogs
   */
  GET_LOGS_BLOCK_RANGE_LIMIT = 2500

  /**
   * Saves receipts to db. Also saves tx hash indexes if within txLookupLimit,
   * and removes tx hash indexes for one block past txLookupLimit.
   * @param block the block to save receipts for
   * @param receipts the receipts to save
   */
  async saveReceipts(block: Block) {
    const vm = await VM.create({
      common: block._common,
      hardforkByBlockNumber: true,
    })
    const receipts: TxReceiptType[] = []
    for (const tx of block.transactions) {
      const txResult = await vm.runTx({
        tx: tx,
        skipBalance: true,
        skipBlockGasLimitValidation: true,
        skipNonce: true,
      })
      receipts.push(txResult.receipt)
      this.protocol.logger.extend('RECEIPT_MANAGER')(txResult.receipt)
    }
    this.protocol.logger.extend('RECEIPT_MANAGER')(`Encoding ${receipts.length} receipts for db`)
    const encoded = this.rlp(RlpConvert.Encode, RlpType.Receipts, receipts)
    await this.protocol.addContentToHistory(
      1,
      HistoryNetworkContentTypes.Receipt,
      toHexString(block.hash()),
      encoded
    )
  }

  /**
   * Returns receipts for given blockHash
   * @param blockHash the block hash
   * @param calcBloom whether to calculate and return the logs bloom for each receipt (default: false)
   * @param includeTxType whether to include the tx type for each receipt (default: false)
   */
  async getReceipts(
    blockHash: Buffer,
    calcBloom?: boolean,
    includeTxType?: true
  ): Promise<TxReceiptWithType[]>
  async getReceipts(
    blockHash: Buffer,
    calcBloom?: boolean,
    includeTxType?: false
  ): Promise<TxReceipt[]>
  async getReceipts(
    blockHash: Buffer,
    calcBloom = false,
    includeTxType = false
  ): Promise<TxReceipt[] | TxReceiptWithType[]> {
    const encoded = await this.db.get(getHistoryNetworkContentId(1, 2, toHexString(blockHash)))
    if (!encoded) return []
    let receipts = this.rlp(
      RlpConvert.Decode,
      RlpType.Receipts,
      Buffer.from(fromHexString(encoded))
    )
    if (calcBloom) {
      receipts = receipts.map((r) => {
        r.bitvector = this.logsBloom(r.logs).bitvector
        return r
      })
    }
    if (includeTxType) {
      const block = (await this.protocol.ETH.getBlockByHash(toHexString(blockHash), true)) as Block
      receipts = (receipts as TxReceiptWithType[]).map((r, i) => {
        r.txType = block.transactions[i].type
        return r
      })
    }
    return receipts
  }

  /**
   * Returns logs as specified by the eth_getLogs JSON RPC query parameters
   */
  async getLogs(
    from: Block,
    to: Block,
    addresses?: Buffer[],
    topics: (Buffer | Buffer[] | null)[] = []
  ): Promise<GetLogsReturn> {
    const returnedLogs: GetLogsReturn = []
    let returnedLogsSize = 0
    for (let i = Number(from.header.number); i <= Number(to.header.number); i++) {
      const block = await this.protocol.ETH.getBlockByNumber(i, true)
      const receipts = await this.getReceipts(block!.hash())
      if (receipts.length === 0) continue
      let logs: GetLogsReturn = []
      let logIndex = 0
      for (const [receiptIndex, receipt] of receipts.entries()) {
        block &&
          logs.push(
            ...receipt!.logs.map((log) => ({
              log,
              block: block,
              tx: block!.transactions[receiptIndex],
              txIndex: receiptIndex,
              logIndex: logIndex++,
            }))
          )
      }
      if (addresses && addresses.length > 0) {
        logs = logs.filter((l) => addresses.some((a) => a.equals(l.log[0])))
      }
      if (topics.length > 0) {
        // From https://eth.wiki/json-rpc/API:
        // Topics are order-dependent. A transaction with a log with topics
        // [A, B] will be matched by the following topic filters:
        //  * [] - anything
        //  * [A] - A in first position (and anything after)
        //  * [null, B] - anything in first position AND B in second position (and anything after)
        //  * [A, B] - A in first position AND B in second position (and anything after)
        //  * [[A, B], [A, B]] - (A OR B) in first position AND (A OR B) in second position (and anything after)
        logs = logs.filter((l) => {
          for (const [i, topic] of topics.entries()) {
            if (Array.isArray(topic)) {
              // Can match any items in this array
              if (!topic.find((t) => t.equals(l.log[1][i]))) return false
            } else if (!topic) {
              // If null then can match any
            } else {
              // If a value is specified then it must match
              if (!topic.equals(l.log[1][i])) return false
            }
            return true
          }
        })
      }
      returnedLogs.push(...logs)
      returnedLogsSize += Buffer.byteLength(JSON.stringify(logs))
      if (
        returnedLogs.length >= this.GET_LOGS_LIMIT ||
        returnedLogsSize >= this.GET_LOGS_LIMIT_MEGABYTES * 1048576
      ) {
        break
      }
    }
    return returnedLogs
  }

  /**
   * RLP encodes or decodes the specified data type for storage or retrieval from the metaDB
   * @param conversion {@link RlpConvert.Encode} or {@link RlpConvert.Decode}
   * @param type one of {@link RlpType}
   * @param value the value to encode or decode
   */
  private rlp(conversion: RlpConvert.Encode, type: RlpType, value: rlpOut): Buffer
  private rlp(conversion: RlpConvert.Decode, type: RlpType.Receipts, values: Buffer): TxReceipt[]
  private rlp(conversion: RlpConvert.Decode, type: RlpType.Logs, value: rlpLog[]): Log[]
  private rlp(conversion: RlpConvert.Decode, type: RlpType.TxHash, value: Buffer): TxHashIndex
  private rlp(conversion: RlpConvert, type: RlpType, value: Buffer | rlpOut): Buffer | rlpOut {
    switch (type) {
      case RlpType.Receipts:
        if (conversion === RlpConvert.Encode) {
          value = value as TxReceipt[]
          return Buffer.from(
            RLP.encode(
              bufArrToArr(
                value.map((r) => [
                  (r as PreByzantiumTxReceipt).stateRoot ??
                    intToBuffer((r as PostByzantiumTxReceipt).status),
                  bigIntToBuffer(r.cumulativeBlockGasUsed),
                  this.rlp(RlpConvert.Encode, RlpType.Logs, r.logs),
                ])
              )
            )
          )
        } else {
          const arr = RLP.decode(Uint8Array.from(value as Buffer)) as NestedUint8Array
          const decoded = arrToBufArr(arr) as rlpReceipt[]
          return decoded.map((r) => {
            const gasUsed = r[1]
            const logs = this.rlp(RlpConvert.Decode, RlpType.Logs, r[2])
            if (r[0].length === 32) {
              // Pre-Byzantium Receipt
              return {
                stateRoot: r[0],
                cumulativeBlockGasUsed: bufferToBigInt(gasUsed),
                logs,
              } as PreByzantiumTxReceipt
            } else {
              // Post-Byzantium Receipt
              return {
                status: bufferToInt(r[0]),
                cumulativeBlockGasUsed: bufferToBigInt(gasUsed),
                logs,
              } as PostByzantiumTxReceipt
            }
          })
        }
      case RlpType.Logs:
        if (conversion === RlpConvert.Encode) {
          return Buffer.from(RLP.encode(bufArrToArr(value as Log[])))
        } else {
          return arrToBufArr(
            RLP.decode(Uint8Array.from(value as Buffer)) as NestedUint8Array
          ) as Log[]
        }
      case RlpType.TxHash:
        if (conversion === RlpConvert.Encode) {
          const [blockHash, txIndex] = value as TxHashIndex
          return Buffer.from(RLP.encode(bufArrToArr([blockHash, intToBuffer(txIndex)])))
        } else {
          const [blockHash, txIndex] = arrToBufArr(
            RLP.decode(Uint8Array.from(value as Buffer)) as NestedUint8Array
          ) as rlpTxHash
          return [blockHash, bufferToInt(txIndex)] as TxHashIndex
        }
      default:
        throw new Error('Unknown rlp conversion')
    }
  }

  /**
   * Returns the logs bloom for a receipt's logs
   * @param logs
   */
  private logsBloom(logs: rlpLog[]) {
    const bloom = new Bloom()
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]
      // add the address
      bloom.add(log[0])
      // add the topics
      const topics = log[1]
      for (let q = 0; q < topics.length; q++) {
        bloom.add(topics[q])
      }
    }
    return bloom
  }
}
