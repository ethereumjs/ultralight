import { createBlock, createBlockHeaderFromRPC } from '@ethereumjs/block'

import {
  TypeOutput,
  bigIntToHex,
  bytesToHex,
  hexToBytes,
  intToHex,
  setLengthLeft,
  toBytes,
  toType,
} from '@ethereumjs/util'
import { createVM, runTx } from '@ethereumjs/vm'
import debug from 'debug'
import { ethers } from 'ethers'

import type { BlockOptions, HeaderData, JsonRpcBlock, Block as ethJsBlock } from '@ethereumjs/block'
import type {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  LegacyTransaction,
  TypedTransaction,
  TypedTxData,
} from '@ethereumjs/tx'
import type { PostByzantiumTxReceipt, PreByzantiumTxReceipt } from '@ethereumjs/vm'
import type { Log, TxReceiptType } from '../networks/index.js'

export async function getBlockReceipts(
  block: Block,
  provider: ethers.JsonRpcProvider,
): Promise<ethers.TransactionReceipt[]> {
  const vm = await createVM({
    common: block.common,
    setHardfork: true,
  })
  const receipts: TxReceiptType[] = []
  for (const tx of block.transactions) {
    const txResult = await runTx(vm, {
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
          blockHash: bytesToHex(block.header.hash()),
          transactionIndex: idx,
          removed: false,
          address: bytesToHex(log[0]),
          data: bytesToHex(log[2]),
          topics: log[1].map((l) => bytesToHex(l)),
          transactionHash: bytesToHex(block.transactions[idx].hash()),
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
        root:
          (r as PreByzantiumTxReceipt).stateRoot !== undefined
            ? bytesToHex((r as PreByzantiumTxReceipt).stateRoot)
            : null,
        gasUsed: block.header.gasUsed,
        logsBloom: bytesToHex(block.header.logsBloom),
        blockHash: bytesToHex(block.hash()),
        hash: bytesToHex(block.transactions[idx].hash()),
        cumulativeGasUsed: r.cumulativeBlockGasUsed,
        logs,
        blockNumber: Number(block.header.number),
        effectiveGasPrice:
          block.transactions[idx].type === 0 ? block.transactions[idx].gasPrice : null,
        type: block.transactions[idx].type,
        status: (r as PostByzantiumTxReceipt).status ?? undefined,
      },
      provider,
    )
  })

  return blockReceipts
}

export async function getTransactionReceipt(
  block: Block,
  idx: number,
  provider: ethers.JsonRpcProvider,
) {
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
      hash: bytesToHex(block.hash()),
      parentHash: bytesToHex(block.header.parentHash),
      number: Number(block.header.number),
      timestamp: Number(block.header.timestamp),
      nonce: bytesToHex(block.header.nonce),
      difficulty: block.header.difficulty,
      gasLimit: block.header.gasLimit,
      miner: block.header.coinbase.toString(),
      gasUsed: block.header.gasUsed,
      extraData: bytesToHex(block.header.extraData),
      transactions: block.transactions.map((tx) => bytesToHex(tx.hash())),
      baseFeePerGas: block.header.baseFeePerGas ?? null,
    },
    provider,
  )
}

export type ExtendedTransactionResponse = {}

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
        hash: bytesToHex(tx.hash()),
        signature: ethers.Signature.from({
          r: tx.r?.toString() ?? '',
          s: tx.s?.toString() ?? '',
          v: Number(tx.v),
        }),
        from: tx.getSenderAddress().toString(),

        nonce: Number(tx.nonce),
        chainId: 1n,
        gasLimit: tx.gasLimit,
        data: bytesToHex(tx.data),
        value: tx.value,
        gasPrice: tx.type === 0 ? tx.gasPrice : 0n,
        maxFeePerGas: tx.type === 2 ? tx.maxFeePerGas : null,
        maxPriorityFeePerGas: tx.type === 2 ? tx.maxPriorityFeePerGas : null,
        blockHash: bytesToHex(block.hash()),
        blockNumber: Number(block.header.number),
        index: txns.length,
        type: tx.type,
        to: tx.to?.toString() ?? null,
        accessList: ethers.accessListify(
          accessListBytesToJSON((tx as EIP2930CompatibleTx)?.accessList),
        ),
      },
      provider,
    )
    txns.push(normedTx)
  }
  return {
    hash: bytesToHex(block.hash()),
    transactions: txns,
    parentHash: bytesToHex(block.header.parentHash),
    number: Number(block.header.number),
    timestamp: Number(block.header.timestamp),
    nonce: bytesToHex(block.header.nonce),
    difficulty: block.header.difficulty,
    gasLimit: block.header.gasLimit,
    miner: block.header.coinbase.toString(),
    gasUsed: block.header.gasUsed,
    extraData: bytesToHex(block.header.extraData),
    _difficulty: block.header.difficulty,
    sha3Uncles: bytesToHex(block.header.uncleHash),
    uncleHeaders: block.uncleHeaders.map((uncle) => bytesToHex(uncle.hash())),
    stateRoot: bytesToHex(block.header.stateRoot),
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
 * Creates a new block object from Ethereum JSON RPC.
 *
 * @param blockParams - Ethereum JSON RPC of block (eth_getBlockByNumber)
 * @param uncles - Optional list of Ethereum JSON RPC of uncles (eth_getUncleByBlockHashAndIndex)
 * @param options - An object describing the blockchain
 */
export function blockFromRpc(
  blockParams: JSONRPCBlock,
  uncles: any[] = [],
  options?: BlockOptions,
) {
  const header = createBlockHeaderFromRPC(blockParams, options)

  const transactions: TypedTransaction[] = []
  const opts = { common: header.common, setHardfork: true }
  for (const _txParams of blockParams.transactions ?? []) {
    const txParams = normalizeTxParams(_txParams)
    const tx = createTx(txParams as TypedTxData, opts)
    transactions.push(tx)
  }

  const uncleHeaders = uncles.map((uh) => createBlockHeaderFromRPC(uh, options))

  return createBlock({ header, transactions, uncleHeaders }, { ...options, setHardfork: true })
}

export function formatBlockResponse(block: Block, includeTransactions: boolean) {
  const json = JSON.stringify(block, null, 2)
  const parsedBlock = JSON.parse(json)
  const header = parsedBlock.header

  const withdrawalsAttr =
    header.withdrawalsRoot !== undefined
      ? {
        withdrawalsRoot: header.withdrawalsRoot!,
        withdrawals: parsedBlock.withdrawals,
      }
      : {}

  const transactions = block.transactions.map((tx, txIndex) =>
    includeTransactions ? toJSONRPCTx(tx, block, txIndex) : bytesToHex(tx.hash()),
  )

  return {
    jsonrpc: '2.0',
    id: 1,
    result: {
      number: header.number,
      hash: bytesToHex(block.hash()),
      parentHash: header.parentHash,
      mixHash: header.mixHash,
      nonce: header.nonce!,
      sha3Uncles: header.uncleHash!,
      logsBloom: header.logsBloom!,
      transactionsRoot: header.transactionsTrie!,
      stateRoot: header.stateRoot!,
      receiptsRoot: header.receiptTrie!,
      miner: header.coinbase!,
      difficulty: header.difficulty!,
      extraData: header.extraData!,
      size: intToHex(block.serialize().length),
      gasLimit: header.gasLimit!,
      gasUsed: header.gasUsed!,
      timestamp: header.timestamp!,
      transactions,
      uncles: block.uncleHeaders.map((uh) => bytesToHex(uh.hash())),
      baseFeePerGas: header.baseFeePerGas,
      ...withdrawalsAttr,
      blobGasUsed: header.blobGasUsed,
      excessBlobGas: header.excessBlobGas,
      parentBeaconBlockRoot: header.parentBeaconBlockRoot,
      requestsRoot: header.requestsRoot,
      withdrawals: block.withdrawals?.map((req) => req.raw()),
    },
  }
}

export function toJSONRPCTx(tx: TypedTransaction, block?: Block, txIndex?: number) {
  const txJSON = tx.toJSON()
  return {
    blockHash: block !== undefined ? bytesToHex(block.hash()) : null,
    blockNumber: block !== undefined ? bigIntToHex(block.header.number) : null,
    from: tx.getSenderAddress().toString(),
    gas: txJSON.gasLimit!,
    gasPrice: txJSON.gasPrice ?? txJSON.maxFeePerGas!,
    maxFeePerGas: txJSON.maxFeePerGas,
    maxPriorityFeePerGas: txJSON.maxPriorityFeePerGas,
    type: intToHex(tx.type),
    accessList: txJSON.accessList,
    chainId: txJSON.chainId,
    hash: bytesToHex(tx.hash()),
    input: txJSON.data!,
    nonce: txJSON.nonce!,
    to: tx.to?.toString() ?? null,
    transactionIndex: txIndex !== undefined ? intToHex(txIndex) : null,
    value: txJSON.value!,
    v: txJSON.v!,
    r: txJSON.r!,
    s: txJSON.s!,
    maxFeePerBlobGas: txJSON.maxFeePerBlobGas,
    blobVersionedHashes: txJSON.blobVersionedHashes,
  }
}

export function formatResponse(result: string) {
  return {
    id: 1,
    jsonrpc: '2.0',
    result,
  }
}

export function executionPayloadHeaderToHeaderData(executionPayloadJson: any): HeaderData {
  return {
    parentHash: hexToBytes(executionPayloadJson.parent_hash),
    uncleHash: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347', // Keccak-256 hash of empty uncle list (PoS blocks have no uncles)
    coinbase: hexToBytes(executionPayloadJson.fee_recipient), // feeRecipient in ExecutionPayload is coinbase in HeaderData
    stateRoot: hexToBytes(executionPayloadJson.state_root),
    transactionsTrie: hexToBytes(executionPayloadJson.transactions_root), // transactionsRoot in ExecutionPayload is transactionsTrie in HeaderData
    receiptTrie: hexToBytes(executionPayloadJson.receipts_root), // receiptsRoot in ExecutionPayload is receiptTrie in HeaderData
    logsBloom: hexToBytes(executionPayloadJson.logs_bloom),
    difficulty: BigInt(0), // In PoS, difficulty is always 0
    number: BigInt(executionPayloadJson.block_number),
    gasLimit: BigInt(executionPayloadJson.gas_limit),
    gasUsed: BigInt(executionPayloadJson.gas_used),
    timestamp: BigInt(executionPayloadJson.timestamp),
    extraData: hexToBytes(executionPayloadJson.extra_data),
    mixHash: hexToBytes(executionPayloadJson.prev_randao), // prevRandao in ExecutionPayload is mixHash in HeaderData
    nonce: '0x0000000000000000', // In PoS, nonce is always 0
    baseFeePerGas: BigInt(executionPayloadJson.base_fee_per_gas),
    withdrawalsRoot: hexToBytes(executionPayloadJson.withdrawals_root),
    blobGasUsed: BigInt(executionPayloadJson.blob_gas_used ?? 0),
    excessBlobGas: BigInt(executionPayloadJson.excess_blob_gas ?? 0),
  }
}

/**
 * Creates a BlockHeader from an execution payload JSON
 * @param executionPayloadJson - JSON object from ssz.deneb.ExecutionPayloadHeader.toJson()
 * @param options - Optional parameters including common
 * @returns BlockHeader instance
 */
export function blockHeaderFromExecutionPayload(executionPayloadJson: any): BlockHeader {
  const headerData = executionPayloadHeaderToHeaderData(executionPayloadJson)
  return BlockHeader.fromHeaderData(headerData, { setHardfork: true })
}
