import { BigNumber, ethers } from 'ethers'
import {
  BlockWithTransactions,
  TransactionReceipt,
  TransactionResponse,
} from '@ethersproject/abstract-provider'
import { Block as ethJsBlock, BlockHeader } from '@ethereumjs/block'
import { toHexString } from './index.js'
import { FeeMarketEIP1559Transaction, Transaction } from '@ethereumjs/tx'
import debug from 'debug'

/*** Temporary imports from @ethereumjs/block */
import { TransactionFactory } from '@ethereumjs/tx'
import { TypeOutput, setLengthLeft, toBuffer, toType } from '@ethereumjs/util'

import { Block, BlockOptions, JsonRpcBlock } from '@ethereumjs/block'

import type { TxData, TypedTransaction } from '@ethereumjs/tx'
import { Log, TxReceiptType } from '../subprotocols/index.js'
import { PostByzantiumTxReceipt, PreByzantiumTxReceipt, VM } from '@ethereumjs/vm'
export interface ExtendedEthersBlock extends ethers.providers.Block {
  blockReward?: BigNumber
  unclesReward?: BigNumber
  feeReward?: BigNumber
  size?: number
  sha3Uncles: string
  uncleHeaders: string[]
  stateRoot: string
  totalDifficulty?: BigNumber
  transactionCount: number
}
export interface ExtendedEthersBlockWithTransactions extends BlockWithTransactions {
  blockReward?: BigNumber
  unclesReward?: BigNumber
  feeReward?: BigNumber
  size?: number
  sha3Uncles: string
  uncleHeaders: string[]
  stateRoot: string
  totalDifficulty?: BigNumber
  transactionCount: number
}

export interface ExtendedTxReceipt extends TransactionReceipt {
  bitvector: string
}

export async function getBlockReceipts(block: Block): Promise<TransactionReceipt[]> {
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

  const blockReceipts: ExtendedTxReceipt[] = receipts.map((r, idx) => {
    const logs = r.logs.map((log: Log, i) => {
      return {
        blockNumber: Number(block.header.number),
        blockHash: toHexString(block.header.hash()),
        transactionIndex: idx,
        removed: false,
        address: toHexString(log[0]),
        data: toHexString(log[2]),
        topics: log[1].map((l) => toHexString(l)),
        transactionHash: toHexString(block.transactions[idx].hash()),
        logIndex: i,
      }
    })
    return {
      to: block.transactions[idx].to!.toString(),
      from: block.transactions[idx].getSenderAddress().toString(),
      contractAddress: block.transactions[idx].getSenderAddress().toString(),
      transactionIndex: idx,
      root: (r as PreByzantiumTxReceipt).stateRoot
        ? toHexString((r as PreByzantiumTxReceipt).stateRoot)
        : undefined,
      gasUsed: BigNumber.from(block.header.gasUsed),
      logsBloom: toHexString(block.header.logsBloom),
      blockHash: toHexString(block.hash()),
      transactionHash: toHexString(block.transactions[idx].hash()),
      cumulativeGasUsed: BigNumber.from(r.cumulativeBlockGasUsed),
      logs: logs,
      blockNumber: Number(block.header.number),
      confirmations: 0,
      effectiveGasPrice:
        block.transactions[idx].type === 0
          ? BigNumber.from((block.transactions[idx] as Transaction).gasPrice)
          : BigNumber.from(0),
      byzantium: (r as PreByzantiumTxReceipt).stateRoot ? false : true,
      type: block.transactions[idx].type,
      status: (r as PostByzantiumTxReceipt).status ?? undefined,
      bitvector: toHexString(r.bitvector),
    }
  })

  return blockReceipts
}

async function getTransactionReceipt(block: Block, idx: number) {
  const receipts = await getBlockReceipts(block)
  return receipts[idx]
}

/**
 *
 * @param block An {@ethereumjs/block Block} object
 * @returns returns an ethers.providers.Block representation of the data
 */
export const ethJsBlockToEthersBlock = (block: ethJsBlock): ExtendedEthersBlock => {
  debug.enable('ethJsBlockToEthersBlock')
  debug('ethJsBlockToEthersBlock')('found a block')

  return {
    hash: toHexString(block.hash()),
    transactions: [],
    parentHash: toHexString(block.header.parentHash),
    number: Number(block.header.number),
    timestamp: Number(block.header.timestamp),
    nonce: toHexString(block.header.nonce),
    difficulty: Number(block.header.difficulty),
    gasLimit: ethers.BigNumber.from(block.header.gasLimit),
    miner: block.header.coinbase.toString(),
    gasUsed: ethers.BigNumber.from(block.header.gasUsed),
    extraData: toHexString(block.header.extraData),
    _difficulty: ethers.BigNumber.from(block.header.difficulty),
    sha3Uncles: toHexString(block.header.uncleHash),
    uncleHeaders: block.uncleHeaders.map((uncle) => toHexString(uncle.hash())),
    stateRoot: toHexString(block.header.stateRoot),
    transactionCount: block.transactions.length,
  }
}

export interface ExtendedTransactionResponse {}

/**
 *
 * @param block An {@ethereumjs/block Block} object
 * @returns returns an ethers.providers.Block representation of the data
 */
export const ethJsBlockToEthersBlockWithTxs = async (
  block: ethJsBlock
): Promise<ExtendedEthersBlockWithTransactions> => {
  debug.enable('ethJsBlockToEthersBlock')
  debug('ethJsBlockToEthersBlockWithTxns')('found a block')

  const txns: TransactionResponse[] = []
  for (const [idx, tx] of Object.entries(block.transactions)) {
    const normedTx: TransactionResponse = {
      hash: toHexString(tx.hash()),
      r: tx.r?.toString(),
      s: tx.s?.toString(),
      v: Number(tx.v),
      confirmations: 0,
      from: tx.getSenderAddress().toString(),
      wait: () => getTransactionReceipt(block, parseInt(idx)),
      nonce: Number(tx.nonce),
      chainId: 1,
      gasLimit: BigNumber.from(tx.gasLimit),
      data: toHexString(tx.data),
      value: ethers.BigNumber.from(tx.value),
      gasPrice: tx.type === 0 ? BigNumber.from((tx as Transaction).gasPrice) : undefined,
      maxFeePerGas:
        tx.type === 2
          ? BigNumber.from((tx as FeeMarketEIP1559Transaction).maxFeePerGas)
          : undefined,
      maxPriorityFeePerGas:
        tx.type === 2
          ? BigNumber.from((tx as FeeMarketEIP1559Transaction).maxPriorityFeePerGas)
          : undefined,
    }
    txns.push(normedTx)
  }
  return {
    hash: toHexString(block.hash()),
    transactions: txns,
    parentHash: toHexString(block.header.parentHash),
    number: Number(block.header.number),
    timestamp: Number(block.header.timestamp),
    nonce: toHexString(block.header.nonce),
    difficulty: Number(block.header.difficulty),
    gasLimit: ethers.BigNumber.from(block.header.gasLimit),
    miner: block.header.coinbase.toString(),
    gasUsed: ethers.BigNumber.from(block.header.gasUsed),
    extraData: toHexString(block.header.extraData),
    _difficulty: ethers.BigNumber.from(block.header.difficulty),
    sha3Uncles: toHexString(block.header.uncleHash),
    uncleHeaders: block.uncleHeaders.map((uncle) => toHexString(uncle.hash())),
    stateRoot: toHexString(block.header.stateRoot),
    transactionCount: txns.length,
  }
}

export function normalizeTxParams(_txParams: any) {
  const txParams = Object.assign({}, _txParams)

  txParams.gasLimit = toType(txParams.gasLimit ?? txParams.gas, TypeOutput.BigInt)
  txParams.data = txParams.data === undefined ? txParams.input : txParams.data

  // check and convert gasPrice and value params
  txParams.gasPrice = txParams.gasPrice !== undefined ? BigInt(txParams.gasPrice) : undefined
  txParams.value = txParams.value !== undefined ? BigInt(txParams.value) : undefined

  // strict byte length checking
  txParams.to =
    txParams.to !== null && txParams.to !== undefined
      ? setLengthLeft(toBuffer(txParams.to), 20)
      : null

  txParams.v = toType(txParams.v, TypeOutput.BigInt)!

  return txParams
}

/**
 * Creates a new block header object from Ethereum JSON RPC.
 *
 * @param blockParams - Ethereum JSON RPC of block (eth_getBlockByNumber)
 * @param options - An object describing the blockchain
 */
export function blockHeaderFromRpc(blockParams: JsonRpcBlock, options?: BlockOptions) {
  const {
    parentHash,
    sha3Uncles,
    miner,
    stateRoot,
    transactionsRoot,
    receiptsRoot,
    logsBloom,
    difficulty,
    number,
    gasLimit,
    gasUsed,
    timestamp,
    extraData,
    mixHash,
    nonce,
    baseFeePerGas,
  } = blockParams

  const blockHeader = BlockHeader.fromHeaderData(
    {
      parentHash,
      uncleHash: sha3Uncles,
      coinbase: miner,
      stateRoot,
      transactionsTrie: transactionsRoot,
      receiptTrie: receiptsRoot,
      logsBloom,
      difficulty: difficulty,
      number,
      gasLimit,
      gasUsed,
      timestamp,
      extraData,
      mixHash,
      nonce,
      baseFeePerGas,
    },
    options
  )

  return blockHeader
}

/**
 * Creates a new block object from Ethereum JSON RPC.
 *
 * @param blockParams - Ethereum JSON RPC of block (eth_getBlockByNumber)
 * @param uncles - Optional list of Ethereum JSON RPC of uncles (eth_getUncleByBlockHashAndIndex)
 * @param options - An object describing the blockchain
 */
export function blockFromRpc(
  blockParams: JsonRpcBlock,
  uncles: any[] = [],
  options?: BlockOptions
) {
  const header = blockHeaderFromRpc(blockParams, options)

  const transactions: TypedTransaction[] = []
  const opts = { common: header._common }
  for (const _txParams of blockParams.transactions ?? []) {
    const txParams = normalizeTxParams(_txParams)
    const tx = TransactionFactory.fromTxData(txParams as TxData, opts)
    transactions.push(tx)
  }

  const uncleHeaders = uncles.map((uh) => blockHeaderFromRpc(uh, options))

  return Block.fromBlockData({ header, transactions, uncleHeaders }, options)
}
