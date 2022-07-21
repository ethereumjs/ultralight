import { JsonTx, TypedTransaction } from '@ethereumjs/tx'
import { Block } from '@ethereumjs/block'
import {
  Address,
  bnToHex,
  bufferToHex,
  intToHex,
  NestedBufferArray,
  toBuffer,
  rlp,
} from 'ethereumjs-util'
import { toHexString } from './Components/DisplayTx'

export type Log = [address: Buffer, topics: Buffer[], data: Buffer]

export interface TxReceipt {
  /**
   * Cumulative gas used in the block including this tx
   */
  gasUsed: Buffer
  /**
   * Bloom bitvector
   */
  bitvector: Buffer
  /**
   * Logs emitted
   */
  logs: Log[]

  status?: 0 | 1

  stateRoot?: Buffer
}

export function bigIntToBuffer(num: bigint) {
  return toBuffer('0x' + num.toString(16))
}

export function bigIntToHex(num: bigint) {
  return `0x${num.toString(16)}`
}

export type JsonRpcTx = {
  blockHash: string | null
  blockNumber: string | null
  from: string
  gas: string
  gasPrice: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  type: string
  accessList?: JsonTx['accessList']
  chainId?: string
  hash: string
  input: string
  nonce: string
  to: string | null
  transactionIndex: string | null
  value: string
  v: string
  r: string
  s: string
}

export type JsonRpcReceipt = {
  transactionHash: string
  transactionIndex: string
  blockHash: string
  blockNumber: string
  from: string
  to: string | null
  cumulativeGasUsed: string
  effectiveGasPrice: string
  gasUsed: string
  contractAddress: string | null
  logs: JsonRpcLog[]
  logsBloom: string
  root?: string
  status?: string
}

export type JsonRpcLog = {
  removed: boolean
  logIndex: string | null
  transactionIndex: string | null
  transactionHash: string | null
  blockHash: string | null
  blockNumber: string | null
  address: string
  data: string
  topics: string[]
}

/**
 * Returns tx formatted to the standard JSON-RPC fields
 */
export const jsonRpcTx = (tx: TypedTransaction, block?: Block, txIndex?: number): JsonRpcTx => {
  const txJSON = tx.toJSON()
  return {
    blockHash: block ? bufferToHex(block.hash()) : null,
    blockNumber: block ? bnToHex(block.header.number) : null,
    from: tx.getSenderAddress().toString(),
    gas: txJSON.gasLimit!,
    gasPrice: txJSON.gasPrice ?? txJSON.maxFeePerGas!,
    maxFeePerGas: txJSON.maxFeePerGas,
    maxPriorityFeePerGas: txJSON.maxPriorityFeePerGas,
    type: intToHex(tx.type),
    accessList: txJSON.accessList,
    chainId: txJSON.chainId,
    hash: bufferToHex(tx.hash()),
    input: txJSON.data!,
    nonce: txJSON.nonce!,
    to: tx.to?.toString() ?? null,
    transactionIndex: txIndex !== undefined ? intToHex(txIndex) : null,
    value: txJSON.value!,
    v: txJSON.v!,
    r: txJSON.r!,
    s: txJSON.s!,
  }
}

/**
 * Returns log formatted to the standard JSON-RPC fields
 */
export const jsonRpcLog = (
  log: Log,
  block?: Block,
  tx?: TypedTransaction,
  txIndex?: number,
  logIndex?: number
): JsonRpcLog => ({
  removed: false, // TODO implement
  logIndex: logIndex !== undefined ? intToHex(logIndex) : null,
  transactionIndex: txIndex !== undefined ? intToHex(txIndex) : null,
  transactionHash: tx ? bufferToHex(tx.hash()) : null,
  blockHash: block ? bufferToHex(block.hash()) : null,
  blockNumber: block ? bnToHex(block.header.number) : null,
  address: bufferToHex(log[0]),
  topics: log[1].map((t) => bufferToHex(t as Buffer)),
  data: bufferToHex(log[2]),
})

/**
 * Returns receipt formatted to the standard JSON-RPC fields
 */
export const jsonRpcReceipt = (
  receipt: TxReceipt,
  gasUsed: bigint,
  effectiveGasPrice: bigint,
  block: Block,
  tx: TypedTransaction,
  txIndex: number,
  logIndex: number,
  contractAddress?: Address
): JsonRpcReceipt => ({
  transactionHash: bufferToHex(tx.hash()),
  transactionIndex: intToHex(txIndex),
  blockHash: bufferToHex(block.hash()),
  blockNumber: bnToHex(block.header.number),
  from: tx.getSenderAddress().toString(),
  to: tx.to?.toString() ?? null,
  cumulativeGasUsed: bufferToHex(receipt.gasUsed),
  effectiveGasPrice: bigIntToHex(effectiveGasPrice),
  gasUsed: bigIntToHex(gasUsed),
  contractAddress: contractAddress?.toString() ?? null,
  logs: receipt.logs.map((l, i) => jsonRpcLog(l, block, tx, txIndex, logIndex + i)),
  logsBloom: bufferToHex(receipt.bitvector),
  root: Buffer.isBuffer(receipt.stateRoot) ? bufferToHex(receipt.stateRoot) : undefined,
  status: Buffer.isBuffer(receipt.status) ? intToHex(receipt.status) : undefined,
})

export function decodeReceipt(
  receipt: string,
  transaction: TypedTransaction,
  gasPrice: string,
  block: Block,
  txIdx: number
) {
  const decoded = rlp.decode(receipt) as NestedBufferArray
  const status =
    Number((decoded[0] as Buffer).toString('hex')) === 0
      ? 0
      : Number(decoded[0].toString('hex')) === 0
      ? 1
      : 0
  const gasUsed = decoded[1] as Buffer
  const bitvector = decoded[2] as Buffer
  const logs: Log[] = (decoded[3] as NestedBufferArray[]).map((_log) => {
    const log = _log as NestedBufferArray
    const address = log[0] as Buffer
    const topics = log[1] as Buffer[]
    const data = log[2] as Buffer
    return [address, topics, data]
  })
  const rec: TxReceipt = {
    status,
    gasUsed,
    bitvector,
    logs,
  }
  const gu = BigInt(toHexString(gasUsed))
  const jsonReceipt = jsonRpcReceipt(rec, gu, BigInt(gasPrice), block, transaction, txIdx, txIdx)

  return jsonReceipt
}
export {}
