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

export async function decodePacketAsync(srcId: string, data: Uint8Array): Promise<IPacket> {
  try {
    console.log('Decrypting packet - total size:', data.length)
    
    if (data.length < MIN_PACKET_SIZE) {
      throw new Error(`Packet too small: ${data.length}`)
    }
    if (data.length > MAX_PACKET_SIZE) {
      throw new Error(`Packet too large: ${data.length}`)
    }
    
    // Extract the masking IV from the beginning of the packet
    const maskingIv = data.slice(0, MASKING_IV_SIZE)
    const srcIdHex = srcId.startsWith('0x') ? srcId.substring(2) : srcId
    const decryptionKey = hexToBytes(srcIdHex).slice(0, MASKING_KEY_SIZE)

    // Create decipher for decrypting the packet contents
    const decipher = localCrypto.createDecipheriv('aes-128-ctr', decryptionKey, maskingIv)
    
    // The data to decrypt starts after the IV
    const encryptedData = data.slice(MASKING_IV_SIZE)
    
    // Decrypt all the data at once
    const decryptedData = await decipher.update(encryptedData)
    
    // Now parse the different parts from the decrypted data
    // Static header
    const staticHeaderBuf = decryptedData.slice(0, STATIC_HEADER_SIZE)
    
    // Extract and validate protocol ID
    const protocolIdBytes = staticHeaderBuf.slice(0, PROTOCOL_SIZE)
    const protocolId = bytesToUtf8(protocolIdBytes)
    
    if (protocolId !== 'discv5') {
      throw new Error(`Invalid protocol id: ${protocolId}, raw bytes: ${Array.from(protocolIdBytes)}`)
    }
    
    // Extract and validate version
    const versionBytes = staticHeaderBuf.slice(PROTOCOL_SIZE, PROTOCOL_SIZE + VERSION_SIZE)
    const version = bytesToNumber(versionBytes, VERSION_SIZE)
    
    if (version !== 1) {
      throw new Error(`Invalid version: ${version}`)
    }
    
    // Extract flag (packet type)
    const flagBytes = staticHeaderBuf.slice(
      PROTOCOL_SIZE + VERSION_SIZE, 
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE
    )
    const flag = bytesToNumber(flagBytes, FLAG_SIZE)
    
    // Extract nonce
    const nonce = staticHeaderBuf.slice(
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE, 
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE
    )
    
    // Extract authdata size
    const authdataSizeBytes = staticHeaderBuf.slice(
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE,
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE + AUTHDATA_SIZE_SIZE
    )
    const authdataSize = bytesToNumber(authdataSizeBytes, AUTHDATA_SIZE_SIZE)
    
    // Extract authdata
    const authdata = decryptedData.slice(STATIC_HEADER_SIZE, STATIC_HEADER_SIZE + authdataSize)
    
    // Construct the complete header
    const header = {
      protocolId,
      version,
      flag,
      nonce,
      authdataSize,
      authdata,
    }
    
    // Create the header buffer (for message authentication later)
    const headerBuf = Buffer.concat([staticHeaderBuf, Buffer.from(authdata)])
    
    // Extract the message part (after the header)
    const message = decryptedData.slice(STATIC_HEADER_SIZE + authdataSize)
    
    // Create the message authentication data
    const messageAd = Buffer.concat([Buffer.from(maskingIv), headerBuf])
    
    // Return the complete packet structure
    return {
      maskingIv,
      header,
      message,
      messageAd,
    }
  } catch (error) {
    console.error('Error in decodePacketAsync:', error)
    throw error
  }
}

// export async function decodePacketAsync(srcId: string, data: Uint8Array): Promise<IPacket> {
//   try {
//     console.log('Decrypting packet - total size:', data.length)
    
//     if (data.length < MIN_PACKET_SIZE) {
//       throw new Error(`Packet too small: ${data.length}`)
//     }
//     if (data.length > MAX_PACKET_SIZE) {
//       throw new Error(`Packet too large: ${data.length}`)
//     }
    
//     // Extract the masking IV from the beginning of the packet
//     const maskingIv = data.slice(0, MASKING_IV_SIZE)
//     const srcIdHex = srcId.startsWith('0x') ? srcId.substring(2) : srcId
//     const decryptionKey = hexToBytes(srcIdHex).slice(0, MASKING_KEY_SIZE)

//     // Create decipher for decrypting the packet contents
//     const decipher = localCrypto.createDecipheriv('aes-128-ctr', decryptionKey, maskingIv)
    
//     // The data to decrypt starts after the IV
//     const encryptedData = data.slice(MASKING_IV_SIZE)
    
//     // First, decrypt just the static header portion
//     const staticHeaderData = encryptedData.slice(0, STATIC_HEADER_SIZE)
//     const staticHeaderBuf = await decipher.update(staticHeaderData)
    
//     // Extract and validate protocol ID
//     const protocolIdBytes = staticHeaderBuf.slice(0, PROTOCOL_SIZE)
//     const protocolId = bytesToUtf8(protocolIdBytes)
    
//     if (protocolId !== 'discv5') {
//       throw new Error(`Invalid protocol id: ${protocolId}, raw bytes: ${Array.from(protocolIdBytes)}`)
//     }
    
//     // Extract and validate version
//     const versionBytes = staticHeaderBuf.slice(PROTOCOL_SIZE, PROTOCOL_SIZE + VERSION_SIZE)
//     const version = bytesToNumber(versionBytes, VERSION_SIZE)
    
//     if (version !== 1) {
//       throw new Error(`Invalid version: ${version}`)
//     }
    
//     // Extract flag (packet type)
//     const flagBytes = staticHeaderBuf.slice(
//       PROTOCOL_SIZE + VERSION_SIZE, 
//       PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE
//     )
//     const flag = bytesToNumber(flagBytes, FLAG_SIZE)
    
//     // Extract nonce
//     const nonce = staticHeaderBuf.slice(
//       PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE, 
//       PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE
//     )
    
//     // Extract authdata size
//     const authdataSizeBytes = staticHeaderBuf.slice(
//       PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE,
//       PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE + AUTHDATA_SIZE_SIZE
//     )
//     const authdataSize = bytesToNumber(authdataSizeBytes, AUTHDATA_SIZE_SIZE)
    
//     const totalDataLength = data.length;
//     const encryptedDataLength = encryptedData.length;
//     const staticHeaderLength = STATIC_HEADER_SIZE;
//     const messageStart = STATIC_HEADER_SIZE + authdataSize;
//     const messageLength = encryptedDataLength - messageStart;
    
//     console.log('Total data length:', totalDataLength);
//     console.log('Encrypted data length:', encryptedDataLength);
//     console.log('Static header length:', staticHeaderLength);
//     console.log('Authdata size:', authdataSize);
//     console.log('Message start position:', messageStart);
//     console.log('Message length:', messageLength);
//     // Now decrypt the authdata portion
//     const authdataEncrypted = encryptedData.slice(STATIC_HEADER_SIZE, STATIC_HEADER_SIZE + authdataSize)
//     const authdata = await decipher.update(authdataEncrypted)
    
//     // Construct the complete header
//     const header = {
//       protocolId,
//       version,
//       flag,
//       nonce,
//       authdataSize,
//       authdata,
//     }
    
//     // Create the header buffer (for message authentication later)
//     const headerBuf = Buffer.concat([staticHeaderBuf, authdata])
    
//     // Extract and decrypt the message part (after the header)
//     const messageEncrypted = encryptedData.slice(messageStart);
//     console.log('Message encrypted length:', messageEncrypted.length);
// const message = messageEncrypted.length > 0 ? await decipher.update(messageEncrypted) : new Uint8Array(0);
//     // const messageEncrypted = encryptedData.slice(STATIC_HEADER_SIZE + authdataSize)
//     // const message = await decipher.update(messageEncrypted)
//     console.log('remaining message ', message)
//     // Create the message authentication data (for AEAD verification)
//     // const messageAd = Buffer.concat([Buffer.from(maskingIv), headerBuf])
//     const messageAd = concatBytes(maskingIv, headerBuf)
    
//     // Return the complete packet structure
//     return {
//       maskingIv,
//       header,
//       message,
//       messageAd,
//     }
//   } catch (error) {
//     console.error('Error in decodePacketAsync:', error)
//     throw error
//   }
// }
