// bls-patch.js
import * as blsEthWasm from 'bls-eth-wasm';

// Create a synthetic default export
const syntheticDefault = { ...blsEthWasm };
export default syntheticDefault;
export * from 'bls-eth-wasm';