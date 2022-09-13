import { INVALID_PARAMS } from '../../error-code.js'
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
}
