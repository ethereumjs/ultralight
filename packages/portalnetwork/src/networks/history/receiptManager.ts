import * as RLP from '@ethereumjs/rlp'
import {
  bigIntToBytes,
  bytesToBigInt,
  bytesToInt,
  equalsBytes,
  hexToBytes,
  intToBytes,
  utf8ToBytes,
  bytesToHex,
} from '@ethereumjs/util'
import { VM } from '@ethereumjs/vm'

import { Bloom, reassembleBlock } from '../index.js'

import type { Log, TxReceiptType, TxReceiptWithType } from '../index.js'
import type { Block } from '@ethereumjs/block'
import type { TypedTransaction } from '@ethereumjs/tx'
import type { NestedUint8Array } from '@ethereumjs/util'
import type { PostByzantiumTxReceipt, PreByzantiumTxReceipt, TxReceipt } from '@ethereumjs/vm'

type rlpReceipt = [postStateOrStatus: Uint8Array, cumulativeGasUsed: Uint8Array, logs: Log[]]

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

export function decodeReceipts(value: Uint8Array) {
  const arr = RLP.decode(Uint8Array.from(value)) as NestedUint8Array
  const decoded = arr as rlpReceipt[]
  return decoded.map((r) => {
    const gasUsed = r[1]
    const logs = r[2]

    if (r[0].length === 32) {
      return {
        stateRoot: r[0],
        cumulativeBlockGasUsed: bytesToBigInt(gasUsed),
        logs,
      } as PreByzantiumTxReceipt
    } else {
      return {
        status: bytesToInt(r[0]),
        cumulativeBlockGasUsed: bytesToBigInt(gasUsed),
        logs,
      } as PostByzantiumTxReceipt
    }
  })
}

export async function saveReceipts(block: Block): Promise<Uint8Array> {
  const vm = await VM.create({
    common: block.common,
    setHardfork: true,
  })
  const receipts: TxReceiptType[] = []
  for (const tx of block.transactions) {
    const txResult = await vm.runTx({
      tx,
      skipBalance: true,
      skipBlockGasLimitValidation: true,
      skipNonce: true,
    })
    receipts.push(txResult.receipt)
  }
  return RLP.encode(
    receipts.map((r) => [
      (r as PreByzantiumTxReceipt).stateRoot ?? intToBytes((r as PostByzantiumTxReceipt).status),
      bigIntToBytes(r.cumulativeBlockGasUsed),
      RLP.encode(r.logs),
    ]),
  )
}

export async function getReceipts(
  encoded: string,
  body?: string,
  calcBloom?: boolean,
  includeTxType?: true,
): Promise<TxReceipt[] | TxReceiptWithType[]> {
  if (!encoded) return []
  let receipts = decodeReceipts(hexToBytes(encoded))
  if (calcBloom !== undefined) {
    receipts = receipts.map((r) => {
      r.bitvector = logsBloom(r.logs).bitvector
      return r
    })
  }
  if (includeTxType && body !== undefined) {
    const block = reassembleBlock(hexToBytes(encoded), hexToBytes(body))
    receipts = (receipts as TxReceiptWithType[]).map((r, i) => {
      r.txType = block.transactions[i].type
      return r
    })
  }
  return receipts
}

export async function getLogs(
  blocks: Block[],
  addresses?: Uint8Array[],
  topics: (Uint8Array | Uint8Array[] | null)[] = [],
): Promise<GetLogsReturn> {
  const returnedLogs: GetLogsReturn = []
  let returnedLogsSize = 0
  for (const block of blocks) {
    const receipts = await getReceipts(bytesToHex(block!.hash()))
    if (receipts.length === 0) continue
    let logs: GetLogsReturn = []
    let logIndex = 0
    for (const [receiptIndex, receipt] of receipts.entries()) {
      block !== undefined &&
        logs.push(
          ...receipt!.logs.map((log) => ({
            log,
            block,
            tx: block!.transactions[receiptIndex],
            txIndex: receiptIndex,
            logIndex: logIndex++,
          })),
        )
    }
    if (addresses && addresses.length > 0) {
      logs = logs.filter((l) => addresses.some((a) => equalsBytes(a, l.log[0])))
    }
    if (topics.length > 0) {
      logs = logs.filter((l) => {
        for (const [i, topic] of topics.entries()) {
          if (Array.isArray(topic)) {
            if (!topic.find((t) => equalsBytes(t, l.log[1][i]))) return false
          } else if (!topic) {
            // If null then can match any
          } else {
            // If a value is specified then it must match
            if (!equalsBytes(topic, l.log[1][i])) return false
          }
          return true
        }
      })
    }
    returnedLogs.push(...logs)
    returnedLogsSize += utf8ToBytes(JSON.stringify(logs)).byteLength
    if (
      returnedLogs.length >= GET_LOGS_LIMIT ||
      returnedLogsSize >= GET_LOGS_LIMIT_MEGABYTES * 1048576
    ) {
      break
    }
  }
  return returnedLogs
}
