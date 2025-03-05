import * as blsWasm from 'bls-eth-wasm'

export default {
  ...blsWasm,
  init: async (curve: any) => {
    if (typeof blsWasm.init === 'function') {
      await blsWasm.init(curve)
    }
    return blsWasm
  }
}