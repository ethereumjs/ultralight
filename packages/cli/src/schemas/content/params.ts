import { INVALID_PARAMS } from '../../error-code.js'
export const content_params = {
  get ConnectionId() {
    return (params: any[], index: number) => {
      if (typeof params[index] !== 'number') {
        return {
          code: INVALID_PARAMS,
          message: `invalid argument ${index}: argument is not a number`,
        }
      }
    }
  },
  get Content() {
    return (params: any[], index: number) => {
      const result = baseTypes.hexString([params[index]], 0)
      if (result !== undefined) {
        return result
      }
    }
  },
}
