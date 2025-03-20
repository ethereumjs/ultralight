import { Buffer } from 'buffer'

class AesGcm {
  private key: Uint8Array
  private nonce: Uint8Array
  private aad: Uint8Array | null = null
  private authTag: Uint8Array | null = null
  private _currentData: Uint8Array | null = null
  
  constructor(key: Uint8Array, iv: Uint8Array) {
    this.key = new Uint8Array(key)
    this.nonce = new Uint8Array(iv)
  }

  setAAD(aad: Uint8Array): void {
    this.aad = new Uint8Array(aad)
  }

  setAuthTag(authTag: Uint8Array): void {
    if (!(authTag instanceof Uint8Array)) {
      authTag = new Uint8Array(authTag);
    }
    this.authTag = authTag;
  }

  async getAuthTag(): Promise<Uint8Array> {
    if (!this.authTag) {
      // If we're calling getAuthTag() before encryption has completed,
      // we need to finalize the encryption
      if (this._currentData) {
        await this.final();
      }
      
      if (!this.authTag) {
        throw new Error('AuthTag not available');
      }
    }
    return this.authTag;
  }

  async update(data: Uint8Array): Promise<Uint8Array> {
    if (!(data instanceof Uint8Array)) {
      data = new Uint8Array(data);
    }
    if (!this._currentData) {
      this._currentData = new Uint8Array(data)
    } else {
      // Concatenate new data with existing data
      const newData = new Uint8Array(this._currentData.length + data.length)
      newData.set(this._currentData, 0)
      newData.set(data, this._currentData.length)
      this._currentData = newData
    }
    
    // In GCM mode, we return an empty array from update() and do the actual
    // encryption/decryption in final() since we need the complete message
    return new Uint8Array(0)
  }
  
  async final(): Promise<Uint8Array> {
    if (!this._currentData) {
      this._currentData = new Uint8Array(0)
    }
    
    // Import the key
    const key = await window.crypto.subtle.importKey(
      'raw',
      this.key,
      { name: 'AES-GCM', length: 128 },
      false,
      [this.authTag ? 'decrypt' : 'encrypt']
    )
    
    try {
      if (this.authTag) {
        // Decryption
        const algorithm = {
          name: 'AES-GCM',
          iv: this.nonce,
          additionalData: this.aad || undefined,
          tagLength: this.authTag.length * 8 // Tag length in bits
        }
        
        // For decryption, we need to append the auth tag to the ciphertext
        const combinedData = new Uint8Array(this._currentData.length + this.authTag.length)
        combinedData.set(this._currentData, 0)
        combinedData.set(this.authTag, this._currentData.length)
        
        const decryptedData = await window.crypto.subtle.decrypt(
          algorithm,
          key,
          combinedData
        )
        
        return new Uint8Array(decryptedData)
      } else {
        // Encryption
        const algorithm = {
          name: 'AES-GCM',
          iv: this.nonce,
          additionalData: this.aad || undefined,
          tagLength: 128 // Standard GCM tag length (16 bytes)
        }
        
        const encryptedData = await window.crypto.subtle.encrypt(
          algorithm,
          key,
          this._currentData
        )
        
        // Split the result: last 16 bytes are the auth tag
        const result = new Uint8Array(encryptedData)
        this.authTag = result.slice(result.length - 16)
        
        // Return the ciphertext without the auth tag
        return result.slice(0, result.length - 16)
      }
    } catch (err) {
      console.error('AES-GCM operation failed:', err)
      throw err
    }
  }
}
class AesCtr {
  private key: Uint8Array
  private initialCounter: Uint8Array
  private counter: Uint8Array
 
  //@ts-ignore
  private keyStream: Uint8Array = new Uint8Array(0)
  //@ts-ignore
  private keyStreamIndex: number = 0

  constructor(key: Uint8Array, iv: Uint8Array) {
    this.key = new Uint8Array(key)
    this.initialCounter = new Uint8Array(iv)
    this.counter = new Uint8Array(iv)
    
    // Pre-allocate keystream buffer
    this.keyStream = new Uint8Array(16) // AES block size
    this.keyStreamIndex = 16 // Force generation of first block
  }

  // Increment 128-bit counter (16 bytes) by one
  private incrementCounter(): void {
    for (let i = this.counter.length - 1; i >= 0; i--) {
      if (++this.counter[i] !== 0) {
        break
      }
    }
  }

  //@ts-ignore
  private async generateKeyStream(): Promise<void> {
    // Import the key for AES
    const key = await window.crypto.subtle.importKey(
      'raw',
      this.key,
      { name: 'AES-CTR', length: 128 },
      false,
      ['encrypt']
    )
    
    // Ensure counter is 16 bytes (pad if necessary)
    let counterBlock = this.counter
    if (counterBlock.length < 16) {
      const paddedCounter = new Uint8Array(16)
      paddedCounter.set(counterBlock)
      counterBlock = paddedCounter
    }
    
    // Encrypt a zero block with the counter as IV to get keystream
    const encryptedData = await window.crypto.subtle.encrypt(
      { 
        name: 'AES-CTR',
        counter: counterBlock,
        length: 128 // Counter size in bits
      },
      key,
      new Uint8Array(16) // Zero block
    )
    
    // Store the keystream
    this.keyStream = new Uint8Array(encryptedData)
    this.keyStreamIndex = 0
    
    // Increment counter for next block
    this.incrementCounter()
  }

  async update(data: Uint8Array): Promise<Uint8Array> {
    // Import the key
    const key = await window.crypto.subtle.importKey(
      'raw',
      this.key,
      { name: 'AES-CTR', length: 128 },
      false,
      ['encrypt']
    )
    
    // Encrypt/decrypt the data in one go
    const processed = await window.crypto.subtle.encrypt(
      { 
        name: 'AES-CTR',
        counter: this.initialCounter,  // Use initial counter
        length: 128 // Counter size in bits
      },
      key,
      data
    )
    
    return new Uint8Array(processed)
  }
  
  // Finalize (typically no additional data for CTR mode)
  async final(): Promise<Uint8Array> {
    return new Uint8Array(0)
  }

  // Reset counter to initial value (important for some protocols)
  reset(): void {
    this.counter = new Uint8Array(this.initialCounter)
    this.keyStreamIndex = 16 // Force regeneration of keystream
  }
}

class BrowserCrypto {
  static async createCipheriv(algorithm: string, key: Uint8Array, iv: Uint8Array): Promise<any> {
    console.log('Creating cipher with algorithm:', algorithm)
    
    const algoLower = algorithm.toLowerCase()
    
    if (algoLower === 'aes-128-ctr') {
      // Ensure key is 16 bytes (128 bits)
      if (key.length !== 16) {
        console.warn(`AES-128 key should be 16 bytes, got ${key.length}. Adjusting...`)
        const adjustedKey = new Uint8Array(16)
        adjustedKey.set(key.slice(0, 16))
        key = adjustedKey
      }
      
      // Ensure IV is at least 16 bytes
      if (iv.length < 16) {
        console.warn(`CTR mode IV should be 16 bytes, got ${iv.length}. Padding...`)
        const adjustedIV = new Uint8Array(16)
        adjustedIV.set(iv)
        iv = adjustedIV
      }
      
      const cipher = new AesCtr(key, iv)
      
      return {
        update: async (data: Uint8Array): Promise<Buffer> => {  
          try {
            const result = await cipher.update(data)
            return Buffer.from(result)
          } catch (err) {
            console.error('Encryption error:', err)
            throw err
          }
        },
        final: async (): Promise<Buffer> => {
          const result = await cipher.final()
          return Buffer.from(result)
        },
        reset: () => {
          cipher.reset()
        }
      }
    } else if (algoLower === 'aes-128-gcm') {
      // Ensure key is 16 bytes (128 bits)
      if (key.length !== 16) {
        console.warn(`AES-128 key should be 16 bytes, got ${key.length}. Adjusting...`)
        const adjustedKey = new Uint8Array(16)
        adjustedKey.set(key.slice(0, 16))
        key = adjustedKey
      }
      
      // For GCM, IV should typically be 12 bytes (96 bits)
      if (iv.length !== 12) {
        console.warn(`GCM mode IV should be 12 bytes, got ${iv.length}. Adjusting...`)
        const adjustedIV = new Uint8Array(12)
        adjustedIV.set(iv.slice(0, Math.min(iv.length, 12)))
        iv = adjustedIV
      }
      
      const cipher = new AesGcm(key, iv)
      
      return {
        update: async (data: Uint8Array): Promise<Buffer> => {  
          try {
            const result = await cipher.update(data)
            return Buffer.from(result)
          } catch (err) {
            console.error('Encryption error:', err)
            throw err
          }
        },
        final: async (): Promise<Buffer> => {
          const result = await cipher.final()
          return Buffer.from(result)
        },
        setAAD: (aad: Uint8Array): void => {
          cipher.setAAD(aad)
        },
        getAuthTag: async (): Promise<Uint8Array> => {
          return await cipher.getAuthTag()
        }
      }
    } else {
      throw new Error(`Algorithm ${algorithm} not supported in browser`)
    }
  }
  
  static async createDecipheriv(algorithm: string, key: Uint8Array, iv: Uint8Array): Promise<any> {   
    const algoLower = algorithm.toLowerCase()
    
    if (algoLower === 'aes-128-ctr') {
      // CTR mode is symmetric - same implementation for encrypt and decrypt
      return this.createCipheriv(algorithm, key, iv)
    } else if (algoLower === 'aes-128-gcm') {
      // Ensure key is 16 bytes (128 bits)
      if (key.length !== 16) {
        console.warn(`AES-128 key should be 16 bytes, got ${key.length}. Adjusting...`)
        const adjustedKey = new Uint8Array(16)
        adjustedKey.set(key.slice(0, 16))
        key = adjustedKey
      }
      
      // For GCM, IV should typically be 12 bytes (96 bits)
      if (iv.length !== 12) {
        console.warn(`GCM mode IV should be 12 bytes, got ${iv.length}. Adjusting...`)
        const adjustedIV = new Uint8Array(12)
        adjustedIV.set(iv.slice(0, Math.min(iv.length, 12)))
        iv = adjustedIV
      }
      
      const cipher = new AesGcm(key, iv)
      
      return {
        update: async (data: Uint8Array): Promise<Buffer> => {  
          try {
            const result = await cipher.update(data)
            return Buffer.from(result)
          } catch (err) {
            console.error('Decryption error:', err)
            throw err
          }
        },
        final: async (): Promise<Buffer> => {
          const result = await cipher.final()
          return Buffer.from(result)
        },
        setAAD: (aad: Uint8Array): void => {
          cipher.setAAD(aad)
        },
        setAuthTag: (authTag: Uint8Array): void => {
          cipher.setAuthTag(authTag)
        }
      }
    } else {
      throw new Error(`Algorithm ${algorithm} not supported in browser`)
    }
  }
}


// Helper function to safely convert any array-like to Uint8Array
function safeUint8Array(data: any): Uint8Array {
  if (data instanceof Uint8Array) {
    return new Uint8Array(data) // Create a copy
  } else if (Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  } else if (Array.isArray(data)) {
    return new Uint8Array(data)
  } else {
    return new Uint8Array(Array.from(data))
  }
}

class SyncCompatAdapter {
  private crypto: Promise<any>
  private pendingUpdates: Array<{ data: Uint8Array, resolve: Function, reject: Function }> = []
  private isProcessing = false
  
  constructor(cryptoPromise: Promise<any>) {
    this.crypto = cryptoPromise
    this.processQueue()
  }
  
  update(data: Uint8Array): any {
    return new Promise((resolve, reject) => {
      this.pendingUpdates.push({ data, resolve, reject })
      
      if (!this.isProcessing) {
        this.processQueue()
      }
    })
  }
  
  final(): Promise<Buffer> {
    return this.crypto.then(crypto => crypto.final())
  }
  
  setAAD(aad: Uint8Array): any {
    // Make sure aad is a Uint8Array
    if (!(aad instanceof Uint8Array)) {
      aad = new Uint8Array(aad);
    }
    
    this.crypto.then(crypto => {
      if (typeof crypto.setAAD === 'function') {
        crypto.setAAD(aad);
      } else {
        console.error('setAAD not supported by this cipher');
      }
    });
    
    return this;
  }

  setAuthTag(authTag: Uint8Array): any {
    // Make sure authTag is a Uint8Array
    if (!(authTag instanceof Uint8Array)) {
      authTag = new Uint8Array(authTag);
    }
    
    this.crypto.then(crypto => {
      if (typeof crypto.setAuthTag === 'function') {
        crypto.setAuthTag(authTag);
      } else {
        console.error('setAuthTag not supported by this cipher');
      }
    });
    
    return this;
  }

   async getAuthTag(): Promise<Uint8Array> {
    const crypto = await this.crypto;
    if (typeof crypto.getAuthTag === 'function') {
      return crypto.getAuthTag();
    } else {
      throw new Error('getAuthTag not supported by this cipher');
    }
  }
  
  private async processQueue() {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    try {
      const crypto = await this.crypto
      
      // Process all pending updates in order
      while (this.pendingUpdates.length > 0) {
        const { data, resolve, reject } = this.pendingUpdates.shift()!
        
        try {
          const result = await crypto.update(data)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
    } catch (error) {
      // If crypto initialization failed, reject all pending updates
      this.pendingUpdates.forEach(update => update.reject(error))
      this.pendingUpdates = []
    } finally {
      this.isProcessing = false
      
      // If more updates came in while processing, start processing again
      if (this.pendingUpdates.length > 0) {
        this.processQueue()
      }
    }
  }
}

const localCrypto = {
  createCipheriv: (algorithm: string, key: any, iv: any) => {
    const keyArray = safeUint8Array(key)
    const ivArray = safeUint8Array(iv)
    
    const cryptoPromise = BrowserCrypto.createCipheriv(algorithm, keyArray, ivArray)
    return new SyncCompatAdapter(cryptoPromise)
  },
  
  createDecipheriv: (algorithm: string, key: any, iv: any) => {
    const keyArray = safeUint8Array(key)
    const ivArray = safeUint8Array(iv)
    
    const cryptoPromise = BrowserCrypto.createDecipheriv(algorithm, keyArray, ivArray)
    return new SyncCompatAdapter(cryptoPromise)
  },
  
  randomBytes: (size: number) => {
    const bytes = window.crypto.getRandomValues(new Uint8Array(size))
    return Buffer.from(bytes)
  }
}

export default localCrypto
