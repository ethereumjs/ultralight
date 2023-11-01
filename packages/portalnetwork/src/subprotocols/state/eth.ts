import { StateProtocol } from './state.js'

/**
 *
 * @param this StateProtocol
 * @param address address to check for balance
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns the balance of the account of given address
 */
export async function eth_getBalance(
  this: StateProtocol,
  address: string,
  blockTag?: string,
): Promise<bigint | undefined> {
  return undefined
}

/**
 *
 * @param this StateProtocol
 * @param address address of the storage
 * @param slot integer of the position in the storage
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns the value at this storage position
 */
export async function eth_getStorageAt(
  this: StateProtocol,
  address: string,
  slot: string,
  blockTag?: string,
): Promise<string | undefined> {
  return undefined
}

/**
 *
 * @param this state protocol
 * @param address address
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns
 */
export async function eth_getTransactionCount(
  this: StateProtocol,
  address: string,
  blockTag?: string,
): Promise<number | undefined> {
  return undefined
}

/**
 *
 * @param this state protocol
 * @param address address
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns code at a given address
 */
export async function eth_getCode(this: StateProtocol, address: string, blockTag?: string) {
  return undefined
}

export type TxCallObject = {
  from?: string
  to: string
  gas?: string
  gasPrice?: string
  value?: string
  data?: string
}

/**
 *
 * @param this state protocol
 * @param txCallObject transaction call object
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns the return value of the executed contract
 */
export async function eth_call(
  this: StateProtocol,
  txCallObject: TxCallObject,
  blockTag?: string,
): Promise<string | undefined> {
  return undefined
}

export type TxEstimateObject = {
  from?: string
  to?: string
  gas?: string
  gasPrice?: string
  value?: string
  data?: string
}

/**
 * Generates and returns an estimate of how much gas is necessary to allow the transaction to complete. The transaction will not be added to the blockchain.
 * @param this state protocol
 * @param txObject transaction object
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns
 */
export async function eth_estimateGas(
  this: StateProtocol,
  txObject: TxEstimateObject,
  blockTag?: string,
): Promise<string | undefined> {
  return undefined
}
