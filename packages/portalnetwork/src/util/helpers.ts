import { ethers } from 'ethers'
import { BlockWithTransactions } from '@ethersproject/abstract-provider'
import { Block as ethJsBlock, BlockHeader } from '@ethereumjs/block'
import { toHexString } from './index.js'
import { FeeMarketEIP1559Transaction, Transaction } from '@ethereumjs/tx'
import debug from 'debug'

/*** Temporary imports from @ethereumjs/block */
import { TransactionFactory } from '@ethereumjs/tx'
import { TypeOutput, setLengthLeft, toBuffer, toType } from '@ethereumjs/util'

import { Block, BlockOptions, JsonRpcBlock } from '@ethereumjs/block'

import type { TxData, TypedTransaction } from '@ethereumjs/tx'

/**
 *
 * @param block An {@ethereumjs/block Block} object
 * @returns returns an ethers.providers.Block representation of the data
 */
export const ethJsBlockToEthersBlock = (block: ethJsBlock): ethers.providers.Block => {
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
  }
}

/**
 *
 * @param block An {@ethereumjs/block Block} object
 * @returns returns an ethers.providers.Block representation of the data
 */
export const ethJsBlockToEthersBlockWithTxs = (block: ethJsBlock): BlockWithTransactions => {
  debug.enable('ethJsBlockToEthersBlock')
  debug('ethJsBlockToEthersBlockWithTxns')('found a block')

  const txns = []
  for (const tx of block.transactions) {
    const normedTx = {
      hash: toHexString(tx.hash()),
      r: tx.r?.toString(),
      s: tx.s?.toString(),
      v: Number(tx.v),
      confirmations: 0,
      from: tx.getSenderAddress().toString(),
      wait: () => Promise<any>,
      nonce: Number(tx.nonce),
      chainId: 1,
      gasLimit: tx.gasLimit?.toString(),
      data: toHexString(tx.data),
      value: ethers.BigNumber.from(tx.value),
      gasPrice: tx.type === 0 ? (tx as Transaction).gasPrice?.toString() : undefined,
      maxFeePerGas:
        tx.type === 2 ? (tx as FeeMarketEIP1559Transaction).maxFeePerGas?.toString() : undefined,
      maxPriorityFeePerGas:
        tx.type === 2
          ? (tx as FeeMarketEIP1559Transaction).maxPriorityFeePerGas?.toString()
          : undefined,
    }
    txns.push(normedTx)
  }
  return {
    hash: toHexString(block.hash()),
    transactions: <any>txns,
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
  console.log(blockParams)

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
