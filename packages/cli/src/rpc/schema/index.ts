import { isFalsy } from './baseTypes.js'

export * from './baseTypes.js'
export * from './content/index.js'
export * from './portal.js'
export const schema = {
  /**
   * Validator to allow validation of an optional value
   * @param validator validator to check against the value
   * @returns validator function with params:
   *   - @param params parameters of method
   *   - @param index index of parameter
   */
  get optional() {
    return (validator: any) => {
      return (params: any, index: number) => {
        if (isFalsy(params[index])) {
          return
        }
        return validator(params, index)
      }
    }
  },
}
