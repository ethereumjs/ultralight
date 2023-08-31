import { Enr } from './rpc/schema/types.js'
import { BaseProtocol } from 'portalnetwork'

/**
 * Check if an Ethereum Node Record (ENR) is valid as specified in EIP-778
 * https://eips.ethereum.org/EIPS/eip-778
 * @param enr a base64 encoded string containing an Ethereum Node Record (ENR)
 */
export const isValidEnr = (enr: Enr) => {
  if (enr && enr.startsWith('enr:-')) {
    return true
  }
  return false
}

/**
 * Add an Ethereum Node Record (ENR) to an instance of a Portal Network protocol
 * @param protocol an instance of a Portal Network protocol
 * @param enr a base64 encoded string containing an Ethereum Node Record (ENR)
 */
export const addBootNode = (protocol: BaseProtocol, enr: Enr) => {
  try {
    protocol!.addBootNode(enr)
  } catch {}
}
