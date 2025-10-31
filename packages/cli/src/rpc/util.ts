import { BitArray } from '@chainsafe/ssz'
import { INTERNAL_ERROR, type RpcError } from './types.js'
import { AcceptCode } from 'portalnetwork'

export const isValidId = (nodeId: string) => {
  return /[^a-z0-9\s]+/.test(nodeId) || nodeId.length !== 64 ? false : true
}

export function callWithStackTrace(handler: Function, debug: boolean) {
  return async (...args: any) => {
    try {
      const res = await handler(...args)
      return res
    } catch (error: any) {
      const e: RpcError = {
        code: error.code ?? INTERNAL_ERROR,
        message: error.message,
      }
      if (debug === true) {
        e['trace'] = error.stack ?? 'Stack trace is not available'
      }

      throw e
    }
  }
}

/**
 * Converts a BitArray (protocol v0) to a boolean array indicating which indexes are true.
 * @param res The response from sendOffer as a BitArray
 * @param contentKeysLength The number of content keys that were offered
 * @returns Object with success array, declined flag, or failed flag
 */
export function bitToBooleanArray(resBitArray: BitArray, contentKeysLength: number): { success: boolean[] } {
  const acceptedBits = resBitArray.getTrueBitIndexes()
  const successArray = new Array(contentKeysLength).fill(false)
  acceptedBits.forEach((index: number) => {
    if (index < contentKeysLength) {
      successArray[index] = true
    }
  })
  return { success: successArray }
}

/**
 * Converts a Uint8Array (protocol v1) to a boolean array indicating which indexes are true.
 * @param res The response from sendOffer as a Uint8Array
 * @param contentKeysLength The number of content keys that were offered
 * @returns Object with success array, declined flag, or failed flag
 */
export function Uint8toBooleanArray(res: Uint8Array, contentKeysLength: number): { success: boolean[] } {
  const successArray = new Array(contentKeysLength).fill(false)
  for (let i = 0; i < contentKeysLength; i++) {
    const byteIndex = Math.floor(i / 8)
    const byte = res[byteIndex]
    if (byte !== undefined) {
      successArray[i] = AcceptCode.ACCEPT
    }
  }
  return { success: successArray }
}