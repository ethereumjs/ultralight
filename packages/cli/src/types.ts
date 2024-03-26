import { bigIntToHex, bytesToHex, intToHex, utf8ToBytes } from '@ethereumjs/util'

import type { Block } from '@ethereumjs/block'
import type { JsonTx, TypedTransaction } from '@ethereumjs/tx'
import type { Address } from '@ethereumjs/util'

export type TxReceipt = PreByzantiumTxReceipt | PostByzantiumTxReceipt

/**
 * Abstract interface with common transaction receipt fields
 */
export interface BaseTxReceipt {
  /**
   * Cumulative gas used in the block including this tx
   */
  cumulativeBlockGasUsed: bigint
  /**
   * Bloom bitvector
   */
  bitvector: Uint8Array
  /**
   * Logs emitted
   */
  logs: Log[]
}

/**
 * Pre-Byzantium receipt type with a field
 * for the intermediary state root
 */
export interface PreByzantiumTxReceipt extends BaseTxReceipt {
  /**
   * Intermediary state root
   */
  stateRoot: Uint8Array
}

/**
 * Receipt type for Byzantium and beyond replacing the intermediary
 * state root field with a status code field (EIP-658)
 */
export interface PostByzantiumTxReceipt extends BaseTxReceipt {
  /**
   * Status of transaction, `1` if successful, `0` if an exception occured
   */
  status: 0 | 1
}

export type Log = [address: Uint8Array, topics: Uint8Array[], data: Uint8Array]

export type GetLogsParams = {
  fromBlock?: string // QUANTITY, block number or "earliest" or "latest" (default: "latest")
  toBlock?: string // QUANTITY, block number or "latest" (default: "latest")
  address?: string // DATA, 20 Bytes, contract address from which logs should originate
  topics?: string[] // DATA, array, topics are order-dependent
  blockHash?: string // DATA, 32 Bytes. With the addition of EIP-234,
  // blockHash restricts the logs returned to the single block with
  // the 32-byte hash blockHash. Using blockHash is equivalent to
  // fromBlock = toBlock = the block number with hash blockHash.
  // If blockHash is present in in the filter criteria, then
  // neither fromBlock nor toBlock are allowed.
}

/*
 * Based on https://eth.wiki/json-rpc/API
 */
export type JsonRpcBlock = {
  number: string // the block number. null when pending block.
  hash: string // hash of the block. null when pending block.
  parentHash: string // hash of the parent block.
  mixHash?: string // bit hash which proves combined with the nonce that a sufficient amount of computation has been carried out on this block.
  nonce: string // hash of the generated proof-of-work. null when pending block.
  sha3Uncles: string // SHA3 of the uncles data in the block.
  logsBloom: string // the bloom filter for the logs of the block. null when pending block.
  transactionsRoot: string // the root of the transaction trie of the block.
  stateRoot: string // the root of the final state trie of the block.
  receiptsRoot: string // the root of the receipts trie of the block.
  miner: string // the address of the beneficiary to whom the mining rewards were given.
  difficulty: string // integer of the difficulty for this block.
  //   totalDifficulty: string // integer of the total difficulty of the chain until this block.
  extraData: string // the “extra data” field of this block.
  size: string // integer the size of this block in bytes.
  gasLimit: string // the maximum gas allowed in this block.
  gasUsed: string // the total used gas by all transactions in this block.
  timestamp: string // the unix timestamp for when the block was collated.
  transactions: Array<JsonRpcTx | string> // Array of transaction objects, or 32 Bytes transaction hashes depending on the last given parameter.
  uncles: string[] // Array of uncle hashes
  baseFeePerGas?: string // If EIP-1559 is enabled for this block, returns the base fee per gas
}
export type JsonRpcTx = {
  blockHash: string | null // DATA, 32 Bytes - hash of the block where this transaction was in. null when it's pending.
  blockNumber: string | null // QUANTITY - block number where this transaction was in. null when it's pending.
  from: string // DATA, 20 Bytes - address of the sender.
  gas: string // QUANTITY - gas provided by the sender.
  gasPrice: string // QUANTITY - gas price provided by the sender in wei. If EIP-1559 tx, defaults to maxFeePerGas.
  maxFeePerGas?: string // QUANTITY - max total fee per gas provided by the sender in wei.
  maxPriorityFeePerGas?: string // QUANTITY - max priority fee per gas provided by the sender in wei.
  type: string // QUANTITY - EIP-2718 Typed Transaction type
  accessList?: JsonTx['accessList'] // EIP-2930 access list
  chainId?: string // Chain ID that this transaction is valid on.
  hash: string // DATA, 32 Bytes - hash of the transaction.
  input: string // DATA - the data send along with the transaction.
  nonce: string // QUANTITY - the number of transactions made by the sender prior to this one.
  to: string | null /// DATA, 20 Bytes - address of the receiver. null when it's a contract creation transaction.
  transactionIndex: string | null // QUANTITY - integer of the transactions index position in the block. null when it's pending.
  value: string // QUANTITY - value transferred in Wei.
  v: string // QUANTITY - ECDSA recovery id
  r: string // DATA, 32 Bytes - ECDSA signature r
  s: string // DATA, 32 Bytes - ECDSA signature s
}
export type JsonRpcReceipt = {
  transactionHash: string // DATA, 32 Bytes - hash of the transaction.
  transactionIndex: string // QUANTITY - integer of the transactions index position in the block.
  blockHash: string // DATA, 32 Bytes - hash of the block where this transaction was in.
  blockNumber: string // QUANTITY - block number where this transaction was in.
  from: string // DATA, 20 Bytes - address of the sender.
  to: string | null // DATA, 20 Bytes - address of the receiver. null when it's a contract creation transaction.
  cumulativeGasUsed: string // QUANTITY  - The total amount of gas used when this transaction was executed in the block.
  effectiveGasPrice: string // QUANTITY - The final gas price per gas paid by the sender in wei.
  gasUsed: string // QUANTITY - The amount of gas used by this specific transaction alone.
  contractAddress: string | null // DATA, 20 Bytes - The contract address created, if the transaction was a contract creation, otherwise null.
  logs: JsonRpcLog[] // Array - Array of log objects, which this transaction generated.
  logsBloom: string // DATA, 256 Bytes - Bloom filter for light clients to quickly retrieve related logs.
  // It also returns either:
  root?: string // DATA, 32 bytes of post-transaction stateroot (pre Byzantium)
  status?: string // QUANTITY, either 1 (success) or 0 (failure)
}
export type JsonRpcLog = {
  removed: boolean // TAG - true when the log was removed, due to a chain reorganization. false if it's a valid log.
  logIndex: string | null // QUANTITY - integer of the log index position in the block. null when it's pending.
  transactionIndex: string | null // QUANTITY - integer of the transactions index position log was created from. null when it's pending.
  transactionHash: string | null // DATA, 32 Bytes - hash of the transactions this log was created from. null when it's pending.
  blockHash: string | null // DATA, 32 Bytes - hash of the block where this log was in. null when it's pending.
  blockNumber: string | null // QUANTITY - the block number where this log was in. null when it's pending.
  address: string // DATA, 20 Bytes - address from which this log originated.
  data: string // DATA - contains one or more 32 Bytes non-indexed arguments of the log.
  topics: string[] // Array of DATA - Array of 0 to 4 32 Bytes DATA of indexed log arguments.
  // (In solidity: The first topic is the hash of the signature of the event
  // (e.g. Deposit(address,bytes32,uint256)), except you declared the event with the anonymous specifier.)
}

/**
 * Returns tx formatted to the standard JSON-RPC fields
 */
export const jsonRpcTx = (tx: TypedTransaction, block?: Block, txIndex?: number): JsonRpcTx => {
  const txJSON = tx.toJSON()
  return {
    blockHash: block ? bytesToHex(block.hash()) : null,
    blockNumber: block ? bigIntToHex(block.header.number) : null,
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
  }
}

/**
 * Returns block formatted to the standard JSON-RPC fields
 */
export const jsonRpcBlock = async (
  block: Block,
  //   chain: Chain,
  includeTransactions: boolean,
): Promise<JsonRpcBlock> => {
  const json = block.toJSON()
  const header = json!.header!
  const transactions = block.transactions.map((tx, txIndex) =>
    includeTransactions ? jsonRpcTx(tx, block, txIndex) : bytesToHex(tx.hash()),
  )
  //   const td = await chain.getTd(block.hash(), block.header.number)
  return {
    number: header.number!,
    hash: bytesToHex(block.hash()),
    parentHash: header.parentHash!,
    mixHash: header.mixHash,
    nonce: header.nonce!,
    sha3Uncles: header.uncleHash!,
    logsBloom: header.logsBloom!,
    transactionsRoot: header.transactionsTrie!,
    stateRoot: header.stateRoot!,
    receiptsRoot: header.receiptTrie!,
    miner: header.coinbase!,
    difficulty: header.difficulty!,
    // totalDifficulty: bigIntToHex(td),
    extraData: header.extraData!,
    size: intToHex(utf8ToBytes(JSON.stringify(json)).byteLength),
    gasLimit: header.gasLimit!,
    gasUsed: header.gasUsed!,
    timestamp: header.timestamp!,
    transactions,
    uncles: block.uncleHeaders.map((uh) => bytesToHex(uh.hash())),
    baseFeePerGas: header.baseFeePerGas,
  }
}

/**
 * Returns log formatted to the standard JSON-RPC fields
 */
export const jsonRpcLog = async (
  log: Log,
  block?: Block,
  tx?: TypedTransaction,
  txIndex?: number,
  logIndex?: number,
): Promise<JsonRpcLog> => ({
  removed: false, // TODO implement
  logIndex: logIndex !== undefined ? intToHex(logIndex) : null,
  transactionIndex: txIndex !== undefined ? intToHex(txIndex) : null,
  transactionHash: tx ? bytesToHex(tx.hash()) : null,
  blockHash: block ? bytesToHex(block.hash()) : null,
  blockNumber: block ? bigIntToHex(block.header.number) : null,
  address: bytesToHex(log[0]),
  topics: log[1].map((t) => bytesToHex(t)),
  data: bytesToHex(log[2]),
})

/**
 * Returns receipt formatted to the standard JSON-RPC fields
 */
export const jsonRpcReceipt = async (
  receipt: TxReceipt,
  gasUsed: bigint,
  effectiveGasPrice: bigint,
  block: Block,
  tx: TypedTransaction,
  txIndex: number,
  logIndex: number,
  contractAddress?: Address,
): Promise<JsonRpcReceipt> => ({
  transactionHash: bytesToHex(tx.hash()),
  transactionIndex: intToHex(txIndex),
  blockHash: bytesToHex(block.hash()),
  blockNumber: bigIntToHex(block.header.number),
  from: tx.getSenderAddress().toString(),
  to: tx.to?.toString() ?? null,
  cumulativeGasUsed: bigIntToHex(receipt.cumulativeBlockGasUsed),
  effectiveGasPrice: bigIntToHex(effectiveGasPrice),
  gasUsed: bigIntToHex(gasUsed),
  contractAddress: contractAddress?.toString() ?? null,
  logs: await Promise.all(
    receipt.logs.map((l: Log, i: number) => jsonRpcLog(l, block, tx, txIndex, logIndex + i)),
  ),
  logsBloom: bytesToHex(receipt.bitvector),
  root:
    (receipt as PreByzantiumTxReceipt).stateRoot instanceof Uint8Array
      ? bytesToHex((receipt as PreByzantiumTxReceipt).stateRoot)
      : undefined,
  status:
    typeof (receipt as PostByzantiumTxReceipt).status === 'number'
      ? intToHex((receipt as PostByzantiumTxReceipt).status)
      : undefined,
})

export interface ClientOpts {
  pk?: string
  bootnode?: string
  bindAddress?: string
  bootnodeList?: string
  rpc: boolean
  rpcPort: number
  rpcAddr?: string
  metrics: boolean
  metricsPort: number
  dataDir?: string
  web3?: string
  networks?: (string | number)[]
  trustedBlockRoot?: string
  radius: number
}

export interface DevnetOpts {
  pks?: string
  numNodes: number
  ip?: string
  promConfig?: boolean
  port: number
  networks: string[]
  connectNodes: boolean
}
