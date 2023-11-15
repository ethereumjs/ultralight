import { Block, BlockHeader } from '@ethereumjs/block'

/*** Temporary imports from @ethereumjs/block */
import { TransactionFactory } from '@ethereumjs/tx'
import { TypeOutput, bytesToHex, setLengthLeft, toBytes, toType } from '@ethereumjs/util'
import { VM } from '@ethereumjs/vm'
import debug from 'debug'
import { ethers } from 'ethers'

import { toHexString } from './index.js'

import type { Log, TxReceiptType } from '../networks/index.js'
import type { BlockOptions, JsonRpcBlock, Block as ethJsBlock } from '@ethereumjs/block'
import type {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  LegacyTransaction,
  TypedTransaction,
  TypedTxData,
} from '@ethereumjs/tx'
import type { PostByzantiumTxReceipt, PreByzantiumTxReceipt } from '@ethereumjs/vm'

export async function getBlockReceipts(
  block: Block,
  provider: ethers.JsonRpcProvider,
): Promise<ethers.TransactionReceipt[]> {
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

  const blockReceipts: ethers.TransactionReceipt[] = receipts.map((r, idx) => {
    const logs = r.logs.map((log: Log, i) => {
      return new ethers.Log(
        {
          blockNumber: Number(block.header.number),
          blockHash: toHexString(block.header.hash()),
          transactionIndex: idx,
          removed: false,
          address: toHexString(log[0]),
          data: toHexString(log[2]),
          topics: log[1].map((l) => toHexString(l)),
          transactionHash: toHexString(block.transactions[idx].hash()),
          index: i,
        },
        provider,
      )
    })
    return new ethers.TransactionReceipt(
      {
        to: block.transactions[idx].to!.toString(),
        from: block.transactions[idx].getSenderAddress().toString(),
        contractAddress: block.transactions[idx].getSenderAddress().toString(),
        index: idx,
        root: (r as PreByzantiumTxReceipt).stateRoot
          ? toHexString((r as PreByzantiumTxReceipt).stateRoot)
          : null,
        gasUsed: block.header.gasUsed,
        logsBloom: toHexString(block.header.logsBloom),
        blockHash: toHexString(block.hash()),
        hash: toHexString(block.transactions[idx].hash()),
        cumulativeGasUsed: r.cumulativeBlockGasUsed,
        logs,
        blockNumber: Number(block.header.number),
        effectiveGasPrice:
          block.transactions[idx].type === 0
            ? (block.transactions[idx] as LegacyTransaction).gasPrice
            : null,
        type: block.transactions[idx].type,
        status: (r as PostByzantiumTxReceipt).status ?? undefined,
      },
      provider,
    )
  })

  return blockReceipts
}

async function getTransactionReceipt(block: Block, idx: number, provider: ethers.JsonRpcProvider) {
  const receipts = await getBlockReceipts(block, provider)
  return receipts[idx]
}

/**
 *
 * @param block An {@ethereumjs/block Block} object
 * @returns returns an ethers.providers.Block representation of the data
 */
export const ethJsBlockToEthersBlock = (
  block: ethJsBlock,
  provider: ethers.JsonRpcProvider,
): ethers.Block => {
  debug.enable('ethJsBlockToEthersBlock')
  debug('ethJsBlockToEthersBlock')('found a block')

  return new ethers.Block(
    {
      hash: toHexString(block.hash()),
      parentHash: toHexString(block.header.parentHash),
      number: Number(block.header.number),
      timestamp: Number(block.header.timestamp),
      nonce: toHexString(block.header.nonce),
      difficulty: block.header.difficulty,
      gasLimit: block.header.gasLimit,
      miner: block.header.coinbase.toString(),
      gasUsed: block.header.gasUsed,
      extraData: toHexString(block.header.extraData),
      transactions: block.transactions.map((tx) => bytesToHex(tx.hash())),
      baseFeePerGas: block.header.baseFeePerGas ?? null,
    },
    provider,
  )
}

export interface ExtendedTransactionResponse {}

/**
 *
 * @param block An {@ethereumjs/block Block} object
 * @returns returns an ethers.providers.Block representation of the data
 */
export const ethJsBlockToEthersBlockWithTxs = async (
  block: ethJsBlock,
  provider: ethers.JsonRpcProvider,
) => {
  debug.enable('ethJsBlockToEthersBlock')
  debug('ethJsBlockToEthersBlockWithTxns')('found a block')

  const txns: ethers.TransactionResponse[] = []
  for (const [_idx, tx] of Object.entries(block.transactions)) {
    const normedTx: ethers.TransactionResponse = new ethers.TransactionResponse(
      {
        hash: toHexString(tx.hash()),
        signature: ethers.Signature.from({
          r: tx.r?.toString() ?? '',
          s: tx.s?.toString() ?? '',
          v: Number(tx.v),
        }),
        from: tx.getSenderAddress().toString(),

        nonce: Number(tx.nonce),
        chainId: 1n,
        gasLimit: tx.gasLimit,
        data: toHexString(tx.data),
        value: tx.value,
        gasPrice: tx.type === 0 ? (tx as LegacyTransaction).gasPrice : 0n,
        maxFeePerGas: tx.type === 2 ? (tx as FeeMarketEIP1559Transaction).maxFeePerGas : null,
        maxPriorityFeePerGas:
          tx.type === 2 ? (tx as FeeMarketEIP1559Transaction).maxPriorityFeePerGas : null,
        blockHash: bytesToHex(block.hash()),
        blockNumber: Number(block.header.number),
        index: txns.length,
        type: tx.type,
        to: tx.to?.toString() ?? null,
        accessList:
          ethers.accessListify((tx as AccessListEIP2930Transaction)?.AccessListJSON) ?? null,
      },
      provider,
    )
    txns.push(normedTx)
  }
  return {
    hash: toHexString(block.hash()),
    transactions: txns,
    parentHash: toHexString(block.header.parentHash),
    number: Number(block.header.number),
    timestamp: Number(block.header.timestamp),
    nonce: toHexString(block.header.nonce),
    difficulty: block.header.difficulty,
    gasLimit: block.header.gasLimit,
    miner: block.header.coinbase.toString(),
    gasUsed: block.header.gasUsed,
    extraData: toHexString(block.header.extraData),
    _difficulty: block.header.difficulty,
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
      ? setLengthLeft(toBytes(txParams.to), 20)
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
      difficulty,
      number,
      gasLimit,
      gasUsed,
      timestamp,
      extraData,
      mixHash,
      nonce,
      baseFeePerGas,
    },
    { ...options, setHardfork: true },
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
  options?: BlockOptions,
) {
  const header = blockHeaderFromRpc(blockParams, options)

  const transactions: TypedTransaction[] = []
  const opts = { common: header.common, setHardfork: true }
  for (const _txParams of blockParams.transactions ?? []) {
    const txParams = normalizeTxParams(_txParams)
    const tx = TransactionFactory.fromTxData(txParams as TypedTxData, opts)
    transactions.push(tx)
  }

  const uncleHeaders = uncles.map((uh) => blockHeaderFromRpc(uh, options))

  return Block.fromBlockData(
    { header, transactions, uncleHeaders },
    { ...options, setHardfork: true },
  )
}
