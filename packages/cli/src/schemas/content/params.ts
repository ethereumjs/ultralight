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
}
