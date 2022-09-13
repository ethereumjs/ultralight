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
  get DataRadius() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'number') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a number`,
        }
      }
      if (params[index] >= 2 ** 256 || params[index] < 0) {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument must be uint256`,
        }
      }
    }
  },
  get Enr() {
    const pattern: RegExp = new RegExp('^enr:[a-zA-Z0-9_:-]{179}$')
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'string') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a string`,
        }
      }
      if (pattern.test(params[index])) {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a valid enr`,
        }
      }
    }
  },
  get ipAddr() {
    const ipAddr: RegExp = new RegExp(
      '((^\\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\\s*$)|(^\\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))(%.+)?\\s*$))'
    )
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'string') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a string`,
        }
      }
      if (!ipAddr.test(params[index])) {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a valid ip address`,
        }
      }
    }
  },
}
