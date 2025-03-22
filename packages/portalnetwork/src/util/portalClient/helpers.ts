import { Buffer } from 'buffer'
import { bytesToNumber } from '@chainsafe/discv5'
import { 
  MASKING_IV_SIZE, 
  MASKING_KEY_SIZE, 
  PROTOCOL_SIZE, 
  VERSION_SIZE, 
  FLAG_SIZE, 
  NONCE_SIZE, 
  AUTHDATA_SIZE_SIZE, 
  STATIC_HEADER_SIZE, 
  MIN_PACKET_SIZE,
  MAX_PACKET_SIZE,
} from '@chainsafe/discv5/packet'
import localCrypto from './localCrypto.js'
import { bytesToUtf8, hexToBytes } from 'ethereum-cryptography/utils'

import type { IPacket } from '@chainsafe/discv5/packet'

// export async function decodePacketAsync(srcId: string, data: Uint8Array): Promise<IPacket> {
//  console.log('Decrypting packet - simple version');
  
//   return {
//     maskingIv: data.slice(0, 16),
//     header: {
//       protocolId: "discv5",
//       version: 1,
//       flag: 0,
//       nonce: new Uint8Array(12),
//       authdataSize: 0,
//       authdata: new Uint8Array(0),
//     },
//     message: new Uint8Array(0),
//   };
// }
export async function decodePacketAsync(srcId: string, data: Uint8Array): Promise<IPacket> {
  try {
    console.log('Decrypting packet - total size:', data.length)
    
    if (data.length < MIN_PACKET_SIZE) {
      throw new Error(`Packet too small: ${data.length}`)
    }
    if (data.length > MAX_PACKET_SIZE) {
      throw new Error(`Packet too large: ${data.length}`)
    }
    
    const maskingIv = data.slice(0, MASKING_IV_SIZE)
    const srcIdHex = srcId.startsWith('0x') ? srcId.substring(2) : srcId
    const decryptionKey = hexToBytes(srcIdHex).slice(0, MASKING_KEY_SIZE)
    console.log('Key type:', decryptionKey?.constructor?.name);
    console.log('IV type:', maskingIv?.constructor?.name);
    const decipher = localCrypto.createDecipheriv('aes-128-ctr', decryptionKey, maskingIv)
    
    // The data to decrypt starts after the IV
    const encryptedData = data.slice(MASKING_IV_SIZE)
    
    // First, decrypt just the static header portion
    const staticHeaderData = encryptedData.slice(0, STATIC_HEADER_SIZE)
    const staticHeaderBuf = await decipher.update(staticHeaderData)
    
    // Extract and validate protocol ID
    const protocolIdBytes = staticHeaderBuf.slice(0, PROTOCOL_SIZE)
    const protocolId = bytesToUtf8(protocolIdBytes)
    console.log('Decoded protocolId:', protocolId, 'raw bytes:', Array.from(protocolIdBytes))
    
    if (protocolId !== 'discv5') {
      throw new Error(`Invalid protocol id: ${protocolId}, raw bytes: ${Array.from(protocolIdBytes)}`)
    }
    
    const versionBytes = staticHeaderBuf.slice(PROTOCOL_SIZE, PROTOCOL_SIZE + VERSION_SIZE)
    const version = bytesToNumber(versionBytes, VERSION_SIZE)
    
    if (version !== 1) {
      throw new Error(`Invalid version: ${version}`)
    }
    
    const flagBytes = staticHeaderBuf.slice(
      PROTOCOL_SIZE + VERSION_SIZE, 
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE
    )
    const flag = bytesToNumber(flagBytes, FLAG_SIZE)
    
    const nonce = staticHeaderBuf.slice(
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE, 
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE
    )
    
    const authdataSizeBytes = staticHeaderBuf.slice(
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE,
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE + AUTHDATA_SIZE_SIZE
    )
    const authdataSize = bytesToNumber(authdataSizeBytes, AUTHDATA_SIZE_SIZE)
    
    // Now decrypt the authdata portion
    const authdataEncrypted = encryptedData.slice(STATIC_HEADER_SIZE, STATIC_HEADER_SIZE + authdataSize)
    console.log('before deciper update', authdataEncrypted)
    const authdata = await decipher.update(authdataEncrypted)
    console.log('after deciper update', authdata)
    const header = {
      protocolId,
      version,
      flag,
      nonce,
      authdataSize,
      authdata,
    }
    
    // Combine the decoded parts as header buffer
    const headerBuf = Buffer.concat([staticHeaderBuf, authdata])
    
    // The remaining data is the message
    const message = encryptedData.slice(MASKING_IV_SIZE + headerBuf.length)
    // const message = encryptedData.slice(STATIC_HEADER_SIZE + authdataSize)
    console.log('remaining message ', message)
    
    // Packet structure
    return {
      maskingIv,
      header,
      message,
      // messageAd: Buffer.concat([Buffer.from(maskingIv), headerBuf]),
    }
  } catch (error) {
    console.error('Error in decodePacketAsync:', error)
    throw error
  }
}