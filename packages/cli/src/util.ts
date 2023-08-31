import { Enr } from './rpc/schema/types.js'
import { BaseProtocol, ProtocolId } from 'portalnetwork'

export const hasValidEnrPrefix = (enr: Enr) => {
  return enr.startsWith('enr:')
}

// remove ENR prefix 'enr:'
export const extractBase64URLCharsFromEnr = (enr: Enr) => {
  return enr.substr(4, enr.length)
}

export const hasValidBase64URLChars = (enr: Enr) => {
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
 * https://eips.ethereum.org/EIPS/eip-778 as a bootnode to an instance of a Portal Network
 * protocol
 * @param protocolId the protocolId associated with an instance of a Portal Network protocol
 * @param baseProtocol the methods of the protocolId instance of a Portal Network protocol
 * @param enr a base64 encoded string containing an Ethereum Node Record (ENR)
 * @throws {Error}
 */
export const addBootNode = async (protocolId: ProtocolId, baseProtocol: BaseProtocol, enr: Enr) => {
  try {
    await baseProtocol!.addBootNode(enr)
    baseProtocol!.logger(`Added bootnode ${enr} to ${protocolId}`)
  } catch (error: any) {
    throw new Error(`Error adding bootnode ${enr} to protocol \
      ${protocolId}: ${error.message ?? error}`)
  }
}
