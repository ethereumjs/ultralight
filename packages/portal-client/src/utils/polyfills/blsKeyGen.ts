import bls from '@chainsafe/bls/herumi'

export function generateRandomSecretKey() {
  return bls.SecretKey.fromKeygen().toBytes()
}

export default {
  generateRandomSecretKey,
}
