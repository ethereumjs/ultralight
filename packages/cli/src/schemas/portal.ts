// portal-network-specs/jsonrpc/src/schemas/portal.json

import { INVALID_PARAMS } from '../error-code.js'
import { baseTypes } from './baseTypes.js'

/**
 * @memberof module:portal
 */
export const portal = {
  /**
   * bucket validator to ensure has array of up to 16 bytes32
   * @param params parameters of method
   * @param index index of parameter
   */
  get Bucket() {
    return (params: any[], index: number) => {
      if (!Array.isArray(params[index])) {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not array`,
        }
      }
      if (params[index].length > 16) {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: max length is 16`,
        }
      }
      for (const value of params[index]) {
        const result = baseTypes.bytes32([value], 0)
        if (result !== undefined) return result
      }
    }
  },
}
