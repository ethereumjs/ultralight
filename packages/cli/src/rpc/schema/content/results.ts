import { INVALID_PARAMS } from '../../error-code.js'
import { baseTypes } from '../baseTypes.js'
import { portalSchema as portal } from '../portal.js'

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
  get ContentResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'boolean') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a bool`,
        }
      }
    }
  },
  get SendContentResult() {
    return (params: any[], index: number) => {
      return baseTypes.bytes8([params[index]], 0)
    }
  },
  get SendFindContentResult() {
    return (params: any[], index: number) => {
      const result = baseTypes.bytes8([params[index]], 0)
      if (result) {
        return result
      }
    }
  },
  get FindContentResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'object') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not an object`,
        }
      }
      const values = Object.values(params[index])
      if (values.length !== 3) {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: expected 3 values`,
        }
      }
      if (typeof values[0] !== 'number') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a number`,
        }
      }
      const content = baseTypes.hexString([values[1]], 0)
      if (content) {
        return content
      }
      const enrs = content_params.Enrs([values[2]], 0)
      if (enrs) {
        return enrs
      }
    }
  },
  get RecursiveFindContentResult() {
    return (params: any[], index: number) => {
      const result = baseTypes.hexString([params[index]], 0)
      if (result) {
        return result
      }
    }
  },
  get FindNodeResult() {
    return (params: any[], index: number) => {
      const findNodeResult = content_params.Enrs([params[index]], 0)
      if (findNodeResult) {
        return findNodeResult
      }
    }
  },
  get RecursiveFindNodeResult() {
    return (params: any[], index: number) => {
      const result = portal.Enr([params[index]], 0)
      if (result) {
        return result
      }
    }
  },
  get SendFindNodeResult() {
    return (params: any[], index: number) => {
      const result = baseTypes.bytes8([params[index]], 0)
      if (result) {
        return result
      }
    }
  },
  get SendNodesResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'number') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a number`,
        }
      }
    }
  },
  get OfferResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'number') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a number`,
        }
      }
    }
  },
  get GossipResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'number') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a number`,
        }
      }
    }
  },
  get SendOfferResult() {
    return (params: any[], index: number) => {
      const sendOfferResult = baseTypes.bytes8([params[index]], 0)
      if (sendOfferResult) {
        return sendOfferResult
      }
    }
  },
  get PingResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'object') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not an object`,
        }
      }
      const values = Object.values(params[index])
      if (values.length !== 2) {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: expected 2 values`,
        }
      }
      if (typeof values[0] !== 'number') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a number`,
        }
      }
      const dataRadius = portal.DataRadius([values[1]], 0)
      if (dataRadius) {
        return dataRadius
      }
    }
  },
  get SendPingResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'object') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not an object`,
        }
      }
      const result = baseTypes.bytes8([Object.values(params[index])[0]], 0)
      if (result) {
        return result
      }
    }
  },
  get SendPongResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'number') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a number`,
        }
      }
    }
  },
  get RoutingTableInfoResult() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'object') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not an object`,
        }
      }
      const properties = Object.values(params[index])
      if (properties.length !== 2) {
        return { code: INVALID_PARAMS, message: `invalid argument ${index}: invalid properties` }
      }
      const nodeId = baseTypes.bytes32(properties, 0)
      if (nodeId) {
        return nodeId
      }
      const buckets = portal.kBuckets(properties, 1)
      if (buckets) {
        return buckets
      }
    }
  },
}
