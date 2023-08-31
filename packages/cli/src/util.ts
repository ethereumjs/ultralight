import { Enr } from './rpc/schema/types.js'
import { BaseProtocol } from 'portalnetwork'

const hasValidEnrPrefix = (enr: Enr) => {
  return enr.startsWith('enr:')
}

// remove ENR prefix 'enr:'
const extractBase64URLCharsFromEnr = (enr: Enr) => {
  return enr.substr(4, enr.length)
}

const hasValidBase64URLChars = (enr: Enr) => {
  const str = extractBase64URLCharsFromEnr(enr)
  const validBase64Chars = /^[A-Za-z0-9_-]+$/i
  if (str && validBase64Chars.test(str)) {
    return true;
  }
  return false;
}

/**
 * Check if an Ethereum Node Record (ENR) is valid as specified in EIP-778
 * https://eips.ethereum.org/EIPS/eip-778 by starting with `enr:` and encoded
 * using valid characters of the Base64URL encoding scheme
 * https://base64.guru/standards/base64url
 * @param enr a base64 encoded string containing an Ethereum Node Record (ENR)
 */
export const isValidEnr = (enr: Enr) => {
  if (enr && hasValidEnrPrefix(enr) && hasValidBase64URLChars(enr)) {
    return true
  }
  return false
}

/**
 * Add a valid Ethereum Node Record (ENR) that is compliant with EIP-778
 * https://eips.ethereum.org/EIPS/eip-778 to an instance of a Portal Network
 * protocol
 * @param protocol an instance of a Portal Network protocol
 * @param enr a base64 encoded string containing an Ethereum Node Record (ENR)
 * @throws {Error}
 */
export const addBootNode = (protocol: BaseProtocol, enr: Enr) => {
  try {
    protocol!.addBootNode(enr)
  } catch (error: any) {
    throw new Error(`Error adding bootnode ${enr} to protocol \
      ${protocol.protocolId}: ${error.message ?? error}`)
  }
}
