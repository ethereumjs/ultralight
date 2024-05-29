import { INTERNAL_ERROR, type RpcError } from './types.js'

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
