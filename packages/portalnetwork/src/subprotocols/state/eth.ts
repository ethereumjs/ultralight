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

export async function eth_getStorageAt(this: StateProtocol, ...args: any) {
  return undefined
}

export async function eth_getTransactionCount(this: StateProtocol, ...args: any) {
  return undefined
}

export async function eth_getCode(this: StateProtocol, ...args: any) {
  return undefined
}

export async function eth_call(this: StateProtocol, ...args: any) {
  return undefined
}

export async function eth_estimateGas(this: StateProtocol, ...args: any) {
  return undefined
}
