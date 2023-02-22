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
import { Bloom, Log, TxReceiptType, TxReceiptWithType, reassembleBlock } from '../index.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { TxReceipt, PostByzantiumTxReceipt, PreByzantiumTxReceipt, VM } from '@ethereumjs/vm'
import { TypedTransaction } from '@ethereumjs/tx'

type rlpReceipt = [postStateOrStatus: Buffer, cumulativeGasUsed: Buffer, logs: Log[]]

export const GET_LOGS_BLOCK_RANGE_LIMIT = 2500
export const GET_LOGS_LIMIT = 10000
export const GET_LOGS_LIMIT_MEGABYTES = 150

export type GetLogsReturn = {
  log: Log
  block: Block
  tx: TypedTransaction
  txIndex: number
  logIndex: number
}[]

export function logsBloom(logs: Log[]) {
  const bloom = new Bloom()
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i]
    bloom.add(log[0])
    const topics = log[1]
    for (let q = 0; q < topics.length; q++) {
      bloom.add(topics[q])
    }
  }
  return bloom
}

export function decodeReceipts(value: Buffer) {
  const arr = RLP.decode(Uint8Array.from(value)) as NestedUint8Array
  const decoded = arrToBufArr(arr) as rlpReceipt[]
  return decoded.map((r) => {
    const gasUsed = r[1]
    const logs = r[2]

    if (r[0].length === 32) {
      return {
        stateRoot: r[0],
        cumulativeBlockGasUsed: bufferToBigInt(gasUsed),
        logs,
      } as PreByzantiumTxReceipt
    } else {
      return {
        status: bufferToInt(r[0]),
        cumulativeBlockGasUsed: bufferToBigInt(gasUsed),
        logs,
      } as PostByzantiumTxReceipt
    }
  })
}

export async function saveReceipts(block: Block): Promise<Buffer> {
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
  }
  return Buffer.from(
    RLP.encode(
      bufArrToArr(
        receipts.map((r) => [
          (r as PreByzantiumTxReceipt).stateRoot ??
            intToBuffer((r as PostByzantiumTxReceipt).status),
          bigIntToBuffer(r.cumulativeBlockGasUsed),
          Buffer.from(RLP.encode(bufArrToArr(r.logs))),
        ])
      )
    )
  )
}

export async function getReceipts(
  encoded: string,
  body?: string,
  calcBloom?: boolean,
  includeTxType?: true
): Promise<TxReceipt[] | TxReceiptWithType[]> {
  if (!encoded) return []
  let receipts = decodeReceipts(Buffer.from(fromHexString(encoded)))
  if (calcBloom) {
    receipts = receipts.map((r) => {
      r.bitvector = logsBloom(r.logs).bitvector
      return r
    })
  }
  if (includeTxType && body) {
    const block = reassembleBlock(fromHexString(encoded), fromHexString(body))
    receipts = (receipts as TxReceiptWithType[]).map((r, i) => {
      r.txType = block.transactions[i].type
      return r
    })
  }
  return receipts
}

export async function getLogs(
  blocks: Block[],
  addresses?: Buffer[],
  topics: (Buffer | Buffer[] | null)[] = []
): Promise<GetLogsReturn> {
  const returnedLogs: GetLogsReturn = []
  let returnedLogsSize = 0
  for (const block of blocks) {
    const receipts = await getReceipts(toHexString(block!.hash()))
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
      logs = logs.filter((l) => {
        for (const [i, topic] of topics.entries()) {
          if (Array.isArray(topic)) {
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
      returnedLogs.length >= GET_LOGS_LIMIT ||
      returnedLogsSize >= GET_LOGS_LIMIT_MEGABYTES * 1048576
    ) {
      break
    }
  }
  return returnedLogs
}
