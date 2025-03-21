
import type { BaseNetwork, NetworkId } from 'portalnetwork'
import type { Enr } from './rpc/schema/types.js'
import path from 'path'
import fs from 'fs'
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
    return true
  }
  return false
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
 * network
 * @param networkId the networkId associated with an instance of a Portal Network network
 * @param baseNetwork the methods of the networkId instance of a Portal Network network
 * @param enr a base64 encoded string containing an Ethereum Node Record (ENR)
 * @throws {Error}
 */
export const addBootNode = async (networkId: NetworkId, baseNetwork: BaseNetwork, enr: Enr) => {
  try {
    await baseNetwork!.addBootNode(enr)
    baseNetwork!.logger(`Added bootnode ${enr} to ${networkId}`)
  } catch (error: any) {
    throw new Error(`Error adding bootnode ${enr} to network \
      ${networkId}: ${error.message ?? error}`)
  }
}

const MEGABYTE = 1000 * 1000

export const dirSize = async (directory: string) => {
  const files = fs.readdirSync(directory)
  const stats = files.map((file) => fs.statSync(path.join(directory, file)))
  const bytesSize = stats.reduce(
    (accumulator, { size }) => accumulator + size,
    0,
  )
  return bytesSize / MEGABYTE
}