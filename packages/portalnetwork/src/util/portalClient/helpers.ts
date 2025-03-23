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
    
    const maskingIv = data.slice(0, MASKING_IV_SIZE)
    const srcIdHex = srcId.startsWith('0x') ? srcId.substring(2) : srcId
    const decryptionKey = hexToBytes(srcIdHex).slice(0, MASKING_KEY_SIZE)

    const decipher = localCrypto.createDecipheriv('aes-128-ctr', decryptionKey, maskingIv)
    const encryptedData = data.slice(MASKING_IV_SIZE)
    const decryptedData = await decipher.update(encryptedData)
    const staticHeaderBuf = decryptedData.slice(0, STATIC_HEADER_SIZE)
    
    const protocolIdBytes = staticHeaderBuf.slice(0, PROTOCOL_SIZE)
    const protocolId = bytesToUtf8(protocolIdBytes)
    
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
    
    const authdata = decryptedData.slice(STATIC_HEADER_SIZE, STATIC_HEADER_SIZE + authdataSize)
    
    const header = {
      protocolId,
      version,
      flag,
      nonce,
      authdataSize,
      authdata,
    }
    
    const headerBuf = Buffer.concat([staticHeaderBuf, Buffer.from(authdata)])
    const message = decryptedData.slice(STATIC_HEADER_SIZE + authdataSize)
    const messageAd = Buffer.concat([Buffer.from(maskingIv), headerBuf])
    
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

