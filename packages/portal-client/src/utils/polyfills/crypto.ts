import { Buffer } from 'buffer'

// Helper functions to convert between Buffer and ArrayBuffer
const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

const arrayBufferToBuffer = (arrayBuffer: ArrayBuffer): Buffer => {
  return Buffer.from(arrayBuffer)
}

class BrowserCipher {
  //@ts-ignore
  private algorithm: string
  private key: Buffer
  //@ts-ignore
  private iv: Buffer
  private data: Buffer[]
  private webCryptoAlgo: any
  private cryptoKey: CryptoKey | null = null

  constructor(algorithm: string, key: Buffer, iv: Buffer) {
    this.algorithm = algorithm
    this.key = key
    this.iv = iv
    this.data = []

    // Map Node.js algorithms to Web Crypto API
    if (algorithm.includes('aes-256-cbc')) {
      this.webCryptoAlgo = {
        name: 'AES-CBC',
        iv: bufferToArrayBuffer(iv)
      }
    } else if (algorithm.includes('aes-256-ctr')) {
      this.webCryptoAlgo = {
        name: 'AES-CTR',
        counter: bufferToArrayBuffer(iv),
        length: 128
      }
    } else {
      // Default to AES-GCM for other algorithms
      this.webCryptoAlgo = {
        name: 'AES-GCM',
        iv: bufferToArrayBuffer(iv)
      }
    }

    // Immediately initialize the key
    this.initializeKey()
  }

  private async initializeKey() {
    try {
      this.cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        bufferToArrayBuffer(this.key),
        { name: this.webCryptoAlgo.name, length: this.key.length * 8 },
        false,
        ['encrypt']
      )
    } catch (error) {
      console.error('Failed to initialize crypto key:', error)
    }
  }

  update(data: Buffer): Buffer {
    this.data.push(data)
    return Buffer.alloc(0)
  }

  async finalAsync(): Promise<Buffer> {
    if (!this.cryptoKey) {
      await this.initializeKey()
      if (!this.cryptoKey) {
        throw new Error('Failed to initialize crypto key')
      }
    }

    // Combine all data chunks
    const combinedData = Buffer.concat(this.data.map(buffer => new Uint8Array(buffer)))
    
    try {
      const encryptedData = await window.crypto.subtle.encrypt(
        this.webCryptoAlgo,
        this.cryptoKey,
        bufferToArrayBuffer(combinedData)
      )
      
      return arrayBufferToBuffer(encryptedData)
    } catch (error) {
      console.error('Encryption failed:', error)
      throw error
    }
  }

  // Synchronous API to match Node.js (but actually returns placeholder)
  final(): Buffer {
    console.warn('Warning: Using synchronous final() in browser environment. This is a placeholder.')
    return Buffer.alloc(0)
  }
}

// Create Node.js-like crypto API
const crypto = {
  createCipheriv: (algorithm: string, key: Buffer, iv: Buffer) => {
    return new BrowserCipher(algorithm, key, iv)
  },
  
  randomBytes: (size: number): Buffer => {
    const bytes = window.crypto.getRandomValues(new Uint8Array(size))
    return Buffer.from(bytes)
  }
}

export default crypto