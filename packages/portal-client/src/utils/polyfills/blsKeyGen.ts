// src/bls-keygen-patch.js
import bls from '@chainsafe/bls/herumi';

// Provide the missing function
export function generateRandomSecretKey() {
  // Create a random secret key using the SecretKey.fromKeygen method
  return bls.SecretKey.fromKeygen().toBytes();
}

// Export other functions that might be needed
export default {
  generateRandomSecretKey
};