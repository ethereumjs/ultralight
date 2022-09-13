import { INVALID_PARAMS } from '../../error-code.js'
import { baseTypes } from '../baseTypes.js'
import { portal } from '../portal.js'
import { content_params } from './params.js'

export const results = {
  get AcceptResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'boolean') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a bool`,
        }
      }
    }
  },
  get SendAcceptResult() {
    return (params: any[], index: number) => {
      return baseTypes.bytes8([params[index]], 0)
    }
  },
  get AddEnrResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'boolean') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a bool`,
        }
      }
    }
  },
  get GetEnrResult() {
    return (params: any[], index: number) => {
      const getEnrResult = content_params.Enr([params[index]], 0)
      if (getEnrResult) {
        return getEnrResult
      }
    }
  },
  get LookupEnrResult() {
    return (params: any[], index: number) => {
      const lookupEnrResult = content_params.Enr([params[index]], 0)
      if (lookupEnrResult) {
        return lookupEnrResult
      }
    }
  },
  get DeleteEnrResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'boolean') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a bool`,
        }
      }
    }
  },
}
