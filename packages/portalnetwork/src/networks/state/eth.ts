import { StateNetwork } from './state.js'

/**
 *
 * @param this StateNetwork
 * @param address address of the storage
 * @param slot integer of the position in the storage
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns the value at this storage position
 */
export async function eth_getStorageAt(
  this: StateNetwork,
  address: string,
  slot: string,
  blockTag?: string,
): Promise<string | undefined> {
  return undefined
}

/**
 *
 * @param this state network
 * @param address address
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns
 */
export async function eth_getTransactionCount(
  this: StateNetwork,
  address: string,
  blockTag?: string,
): Promise<number | undefined> {
  return undefined
}

/**
 *
 * @param this state network
 * @param address address
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns code at a given address
 */
export async function eth_getCode(this: StateNetwork, address: string, blockTag?: string) {
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
 * @param this state network
 * @param txCallObject transaction call object
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns the return value of the executed contract
 */
export async function eth_call(
  this: StateNetwork,
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
 * @param this state network
 * @param txObject transaction object
 * @param blockTag integer block number, or the string "latest", "earliest" or "pending"
 * @returns
 */
export async function eth_estimateGas(
  this: StateNetwork,
  txObject: TxEstimateObject,
  blockTag?: string,
): Promise<string | undefined> {
  return undefined
}
