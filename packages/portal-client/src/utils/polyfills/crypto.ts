import { Buffer } from 'buffer';

// Manually implement AES-CTR since the Web Crypto API doesn't expose CTR mode in a compatible way
class AesCtr {
  private key: Uint8Array;
  private counter: Uint8Array;
  private cryptoKey: Promise<CryptoKey>;

  constructor(key: Uint8Array, iv: Uint8Array) {
    // Make copies to avoid mutating the original buffers
    this.key = new Uint8Array(key);
    this.counter = new Uint8Array(iv);
    
    // Import the key for AES-ECB (we'll handle the CTR mode ourselves)
    this.cryptoKey = window.crypto.subtle.importKey(
      'raw',
      this.key,
      { name: 'AES-CBC' },  // Use CBC, but we'll only use it for block encryption
      false,
      ['encrypt']
    );
  }

  // Increment the counter block
  private incrementCounter(): void {
    for (let i = this.counter.length - 1; i >= 0; i--) {
      if (++this.counter[i] !== 0) {
        break;
      }
    }
  }

  // Process data in CTR mode
  async process(data: Uint8Array): Promise<Uint8Array> {
    const result = new Uint8Array(data.length);
    const blockSize = 16; // AES block size

    // For each block
    for (let offset = 0; offset < data.length; offset += blockSize) {
      // Get the current counter block
      const counterBlock = new Uint8Array(this.counter);
      
      // We'll use AES-CBC with zero IV for each block as a substitute for ECB
      // This is because Web Crypto API doesn't expose ECB mode directly
      const zeroIv = new Uint8Array(16);
      
      // Encrypt the counter block
      const encryptedCounter = await window.crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: zeroIv },
        await this.cryptoKey,
        // Pad the counter to 16 bytes if needed
        counterBlock.length === 16 ? counterBlock : 
          new Uint8Array([...counterBlock, ...new Uint8Array(16 - counterBlock.length)])
      );
      
      // The first 16 bytes of the encrypted result is our keystream block
      const keyStream = new Uint8Array(encryptedCounter.slice(0, 16));
      
      // XOR the keystream with the data
      const blockLength = Math.min(blockSize, data.length - offset);
      for (let i = 0; i < blockLength; i++) {
        result[offset + i] = data[offset + i] ^ keyStream[i];
      }
      
      // Increment the counter for the next block
      this.incrementCounter();
    }
    
    return result;
  }
}

// Browser-compatible crypto implementation
class BrowserCrypto {
  static async createCipheriv(algorithm: string, key: Uint8Array, iv: Uint8Array): Promise<any> {
    console.log('createCipheriv called with:', algorithm);
    console.log('Key:', Array.from(key));
    console.log('IV:', Array.from(iv));
    
    if (algorithm !== 'aes-128-ctr') {
      throw new Error(`Algorithm ${algorithm} not supported in browser`);
    }
    
    const cipher = new AesCtr(key, iv);
    
    return {
      update: async (data: Uint8Array): Promise<Buffer> => {
        console.log('Cipher update called with data length:', data.length);
        const result = await cipher.process(data);
        return Buffer.from(result);
      },
      final: () => {
        return Buffer.alloc(0);
      }
    };
  }
  
  static async createDecipheriv(algorithm: string, key: Uint8Array, iv: Uint8Array): Promise<any> {
    // CTR mode is symmetric, so decipher is the same as cipher
    return this.createCipheriv(algorithm, key, iv);
  }
}

// Create a synchronous-looking API around the async implementation
class AsyncToSyncAdapter {
  //@ts-ignore
  private algorithm: string;
    //@ts-ignore
  private key: Uint8Array;
    //@ts-ignore
  private iv: Uint8Array;
  private cryptoPromise: Promise<any>;
  private lastResult: Promise<Buffer> = Promise.resolve(Buffer.alloc(0));
  
  constructor(algorithm: string, key: Uint8Array, iv: Uint8Array, isDecipher: boolean = false) {
    this.algorithm = algorithm;
    this.key = key;
    this.iv = iv;
    
    if (isDecipher) {
      this.cryptoPromise = BrowserCrypto.createDecipheriv(algorithm, key, iv);
    } else {
      this.cryptoPromise = BrowserCrypto.createCipheriv(algorithm, key, iv);
    }
  }
  
  update(data: Uint8Array): Promise<Buffer> {
    this.lastResult = this.cryptoPromise.then(crypto => crypto.update(data));
    return this.lastResult;
  }
  
  final(): Promise<Buffer> {
    return this.cryptoPromise.then(crypto => crypto.final());
  }
}

// Helper function to safely convert Buffer or Uint8Array to plain Uint8Array
function safeUint8Array(data: Buffer | Uint8Array): Uint8Array {
  // Create a completely new Uint8Array with the values from the input
  return new Uint8Array(Array.from(data));
}

// Export the crypto interface
const localCrypto = {
  createCipheriv: (algorithm: string, key: Buffer | Uint8Array, iv: Buffer | Uint8Array) => {
    // Convert to plain Uint8Array without referencing the original buffer
    const keyArray = safeUint8Array(key);
    const ivArray = safeUint8Array(iv);
    return new AsyncToSyncAdapter(algorithm, keyArray, ivArray);
  },
  
  createDecipheriv: (algorithm: string, key: Buffer | Uint8Array, iv: Buffer | Uint8Array) => {
    // Convert to plain Uint8Array without referencing the original buffer
    const keyArray = safeUint8Array(key);
    const ivArray = safeUint8Array(iv);
    return new AsyncToSyncAdapter(algorithm, keyArray, ivArray, true);
  },
  
  randomBytes: (size: number) => {
    const bytes = window.crypto.getRandomValues(new Uint8Array(size));
    return Buffer.from(bytes);
  }
};

export default localCrypto;
