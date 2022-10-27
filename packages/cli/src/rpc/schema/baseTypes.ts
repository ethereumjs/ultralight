// portal-network-specs/jsonrpc/src/schemas/base_types.json

const INVALID_PARAMS = -32602

type Falsy = false | '' | 0 | null | undefined | 0n

export function isFalsy(value: unknown): value is Falsy {
  return !!(
    value === false ||
    value === '' ||
    value === 0 ||
    Number.isNaN(value) ||
    value === null ||
    typeof value === 'undefined' ||
    value === BigInt(0)
  )
}

/**
 * Returns true if a value is truthy
 *
 * @param value - Value to check for truthiness
 *
 * @deprecated This helper function should only be used temporarily until the monorepo types are explicit enough
 */
export function isTruthy<T>(value: T | Falsy): value is T {
  return !isFalsy(value)
}

/**
 * middleware for parameters validation
 * @memberof module:rpc
 * @param method function to add middleware
 * @param requiredParamsCount required parameters count
 * @param validators array of validators
 */
export function middleware(method: any, requiredParamsCount: number, validators: any[] = []): any {
  return function (params: any[] = []) {
    return new Promise((resolve, reject) => {
      if (params.length < requiredParamsCount) {
        const error = {
          code: INVALID_PARAMS,
          message: `missing value for required argument ${params.length}`,
        }
        return reject(error)
      }

      for (let i = 0; i < validators.length; i++) {
        if (isTruthy(validators[i])) {
          for (let j = 0; j < validators[i].length; j++) {
            const error = validators[i][j](params, i)
            if (isTruthy(error)) {
              return reject(error)
            }
          }
        }
      }

      resolve(method(params))
    })
  }
}

export function validateByteString(param: any, index: number, length?: number) {
  if (typeof param !== 'string') {
    return {
      code: INVALID_PARAMS,
      message: `invalid argument ${index}: argument must be a hex string`,
    }
  }

  if (param.slice(0, 2) !== '0x') {
    return {
      code: INVALID_PARAMS,
      message: `invalid argument ${index}: missing 0x prefix`,
    }
  }

  const address = param.slice(2)

  if (length && length === 1 && address.length < 1) {
    return {
      code: INVALID_PARAMS,
      message: `invalid argument ${index}: invalid length`,
    }
  } else if (length && address.length !== length) {
    return {
      code: INVALID_PARAMS,
      message: `invalid argument ${index}: invalid length`,
    }
  }
  if (!/^[0-9a-fA-F]+$/.test(address)) {
    return {
      code: INVALID_PARAMS,
      message: `invalid argument ${index}: invalid address`,
    }
  }
}

/**
 * @memberof module:rpc
 */
export const baseTypes = {
  /**
   * bytes2 validator to ensure has `0x` prefix and 4 bytes length
   * @param params parameters of method
   * @param index index of parameter
   */
  get bytes2() {
    return (params: any[], index: number) => {
      return validateByteString(params[index], index, 4)
    }
  },
  /**
   * bytes2 validator to ensure has `0x` prefix and 8 bytes length
   * @param params parameters of method
   * @param index index of parameter
   */
  get bytes4() {
    return (params: any[], index: number) => {
      return validateByteString(params[index], index, 8)
    }
  },
  /**
   * bytes2 validator to ensure has `0x` prefix and 16 bytes length
   * @param params parameters of method
   * @param index index of parameter
   */
  get bytes8() {
    return (params: any[], index: number) => {
      return validateByteString(params[index], index, 16)
    }
  },
  /**
   * bytes2 validator to ensure has `0x` prefix and 32 bytes length
   * @param params parameters of method
   * @param index index of parameter
   */
  get bytes16() {
    return (params: any[], index: number) => {
      return validateByteString(params[index], index, 32)
    }
  },
  /**
   * bytes2 validator to ensure has `0x` prefix and 64 bytes length
   * @param params parameters of method
   * @param index index of parameter
   */
  get bytes32() {
    return (params: any[], index: number) => {
      return validateByteString(params[index], index, 64)
    }
  },
  /**
   * bytes2 validator to ensure has `0x` prefix and 66 bytes length
   * @param params parameters of method
   * @param index index of parameter
   */
  get bytes33() {
    return (params: any[], index: number) => {
      return validateByteString(params[index], index, 66)
    }
  },
  /**
   * bytes2 validator to ensure has `0x` prefix and 66 bytes length
   * @param params parameters of method
   * @param index index of parameter
   */
  get hexString() {
    return (params: any[], index: number) => {
      return validateByteString(params[index], index, 66)
    }
  },
}
