import { Crypto } from '@peculiar/webcrypto';

// Create a singleton instance of WebCrypto
let webCryptoInstance: Crypto;

// Initialize the webcrypto instance safely in browser environment
function getWebCrypto(): Crypto {
  if (!webCryptoInstance) {
    try {
      webCryptoInstance = new Crypto();
      console.log('WebCrypto polyfill initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebCrypto polyfill:', error);
      // Fallback to native crypto if available
      if (typeof window !== 'undefined' && window.crypto) {
        console.log('Falling back to native crypto');
        return window.crypto as any;
      }
      throw new Error('No WebCrypto implementation available');
    }
  }
  return webCryptoInstance;
}

// Error handling wrapper for async operations
async function safeAsync<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error('Crypto operation failed:', error);
    throw error;
  }
}

interface Cipher {
  update(data: Uint8Array): Promise<Buffer>;
  final(): Promise<Buffer>;
  setAAD?(additionalData: Uint8Array): void;
  getAuthTag?(): Uint8Array;
}

interface Decipher extends Cipher {
  setAuthTag?(tag: Uint8Array): void;
}

class CipherImpl implements Cipher {
  private cryptoKey: CryptoKey;
  private algorithm: any;
  private buffer: Uint8Array = new Uint8Array(0);
  private aad: Uint8Array | null = null;
  private authTag: Uint8Array | null = null;
  private crypto: Crypto;

  constructor(cryptoKey: CryptoKey, algorithm: any) {
    this.cryptoKey = cryptoKey;
    this.algorithm = algorithm;
    this.crypto = getWebCrypto();
  }

  async update(data: Uint8Array | ArrayBuffer): Promise<Buffer> {
    const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data);

    if (this.algorithm.name === 'AES-CTR') {
      const encrypted = await safeAsync(
        this.crypto.subtle.encrypt(
          this.algorithm,
          this.cryptoKey,
          dataArray
        )
      );
      return Buffer.from(encrypted);
    } else {
      // For GCM, collect data for final encryption
      const newBuffer = new Uint8Array(this.buffer.length + dataArray.length);
      newBuffer.set(this.buffer, 0);
      newBuffer.set(dataArray, this.buffer.length);
      this.buffer = newBuffer;
      return Buffer.from([]);
    }
  }

  async final(): Promise<Buffer> {
    if (this.algorithm.name === 'AES-CTR') {
      return Buffer.from([]);
    } else {
      if (this.aad) {
        this.algorithm.additionalData = this.aad;
      }

      const result = await safeAsync(
        this.crypto.subtle.encrypt(
          this.algorithm,
          this.cryptoKey,
          this.buffer
        )
      );

      const encrypted = new Uint8Array(result);
      this.authTag = encrypted.slice(encrypted.length - 16);

      return Buffer.from(encrypted.slice(0, encrypted.length - 16));
    }
  }

  setAAD(additionalData: Uint8Array | ArrayBuffer): void {
    this.aad = additionalData instanceof Uint8Array 
      ? additionalData 
      : new Uint8Array(additionalData);
  }

  getAuthTag(): Uint8Array {
    if (!this.authTag) {
      throw new Error('Auth tag not available');
    }
    return this.authTag;
  }
}

class DecipherImpl implements Decipher {
  private cryptoKey: CryptoKey;
  private algorithm: any;
  private buffer: Uint8Array = new Uint8Array(0);
  private aad: Uint8Array | null = null;
  private authTag: Uint8Array | null = null;
  private crypto: Crypto;
  private isCTR: boolean;

  constructor(cryptoKey: CryptoKey, algorithm: any, isCTR: boolean) {
    this.cryptoKey = cryptoKey;
    this.algorithm = algorithm;
    this.crypto = getWebCrypto();
    this.isCTR = isCTR;
  }

  async update(data: Uint8Array | ArrayBuffer): Promise<Buffer> {
    const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data);

    if (this.isCTR) {
      const decrypted = await safeAsync(
        this.crypto.subtle.decrypt(
          this.algorithm,
          this.cryptoKey,
          dataArray
        )
      );
      return Buffer.from(decrypted);
    } else {
      // For GCM, collect data for final decryption
      const newBuffer = new Uint8Array(this.buffer.length + dataArray.length);
      newBuffer.set(this.buffer, 0);
      newBuffer.set(dataArray, this.buffer.length);
      this.buffer = newBuffer;
      return Buffer.from([]);
    }
  }

  async final(): Promise<Buffer> {
    if (this.isCTR) {
      return Buffer.from([]);
    } else {
      if (!this.authTag) {
        throw new Error('Auth tag must be set for GCM decryption');
      }

      const dataWithTag = new Uint8Array(this.buffer.length + this.authTag.length);
      dataWithTag.set(this.buffer, 0);
      dataWithTag.set(this.authTag, this.buffer.length);

      if (this.aad) {
        this.algorithm.additionalData = this.aad;
      }

      try {
        const decrypted = await safeAsync(
          this.crypto.subtle.decrypt(
            this.algorithm,
            this.cryptoKey,
            dataWithTag
          )
        );

        return Buffer.from(decrypted);
      } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Decryption failed: authentication tag mismatch');
      }
    }
  }

  setAAD(additionalData: Uint8Array | ArrayBuffer): void {
    this.aad = additionalData instanceof Uint8Array 
      ? additionalData 
      : new Uint8Array(additionalData);
  }

  setAuthTag(tag: Uint8Array | ArrayBuffer): void {
    this.authTag = tag instanceof Uint8Array ? tag : new Uint8Array(tag);
  }
}

const localCrypto = {
  createCipheriv: async (
    algorithm: string,
    key: Uint8Array | ArrayBuffer,
    iv: Uint8Array | ArrayBuffer
  ): Promise<Cipher> => {
    const crypto = getWebCrypto();
    let cryptoAlgorithm: any;
    let keyUsage: KeyUsage[];
    //@ts-ignore
    let keyLength: number;
    let keyAlgorithm: any;

    switch (algorithm.toLowerCase()) {
      case 'aes-128-ctr':
        cryptoAlgorithm = {
          name: 'AES-CTR',
          counter: iv instanceof Uint8Array ? iv : new Uint8Array(iv),
          length: 128, // Counter size in bits
        };
        keyAlgorithm = { name: 'AES-CTR', length: 128 };
        keyUsage = ['encrypt'];
        keyLength = 128;
        break;
      case 'aes-128-gcm':
        cryptoAlgorithm = {
          name: 'AES-GCM',
          iv: iv instanceof Uint8Array ? iv : new Uint8Array(iv),
          tagLength: 128, // Standard GCM tag length
        };
        keyAlgorithm = { name: 'AES-GCM', length: 128 };
        keyUsage = ['encrypt'];
        keyLength = 128;
        break;
      default:
        throw new Error(`Algorithm ${algorithm} not supported`);
    }

    const keyArray = key instanceof Uint8Array ? key : new Uint8Array(key);

    try {
      const cryptoKey = await safeAsync(
        crypto.subtle.importKey(
          'raw',
          keyArray,
          keyAlgorithm,
          false,
          keyUsage
        )
      );

      return new CipherImpl(cryptoKey, cryptoAlgorithm);
    } catch (error) {
      console.error(`Failed to create cipher for ${algorithm}:`, error);
      throw error;
    }
  },

  createDecipheriv: async (
    algorithm: string,
    key: Uint8Array | ArrayBuffer,
    iv: Uint8Array | ArrayBuffer
  ): Promise<Decipher> => {
    const crypto = getWebCrypto();
    let cryptoAlgorithm: any;
    let keyUsage: KeyUsage[];
    let keyAlgorithm: any;
    let isCTR = false;

    switch (algorithm.toLowerCase()) {
      case 'aes-128-ctr':
        cryptoAlgorithm = {
          name: 'AES-CTR',
          counter: iv instanceof Uint8Array ? iv : new Uint8Array(iv),
          length: 128,
        };
        keyAlgorithm = { name: 'AES-CTR', length: 128 };
        keyUsage = ['decrypt'];
        isCTR = true;
        break;
      case 'aes-128-gcm':
        cryptoAlgorithm = {
          name: 'AES-GCM',
          iv: iv instanceof Uint8Array ? iv : new Uint8Array(iv),
          tagLength: 128,
        };
        keyAlgorithm = { name: 'AES-GCM', length: 128 };
        keyUsage = ['decrypt'];
        break;
      default:
        throw new Error(`Algorithm ${algorithm} not supported`);
    }

    const keyArray = key instanceof Uint8Array ? key : new Uint8Array(key);

    try {
      const cryptoKey = await safeAsync(
        crypto.subtle.importKey(
          'raw',
          keyArray,
          keyAlgorithm,
          false,
          keyUsage
        )
      );

      return new DecipherImpl(cryptoKey, cryptoAlgorithm, isCTR);
    } catch (error) {
      console.error(`Failed to create decipher for ${algorithm}:`, error);
      throw error;
    }
  },

  randomBytes: (size: number): Buffer => {
    try {
      const crypto = getWebCrypto();
      const bytes = crypto.getRandomValues(new Uint8Array(size));
      return Buffer.from(bytes);
    } catch (error) {
      console.error('Failed to generate random bytes:', error);
      throw error;
    }
  },
};

// Create a compatibility wrapper
class SyncCompatAdapter {
  private asyncMethod: Promise<Cipher | Decipher>;
  private instance: Cipher | Decipher | null = null;
  private pendingUpdates: Array<{ data: Uint8Array, resolve: Function, reject: Function }> = [];
  private isProcessing = false;
  private aadValue: Uint8Array | null = null;
  private authTagValue: Uint8Array | null = null;
  
  constructor(asyncMethod: Promise<Cipher | Decipher>) {
    this.asyncMethod = asyncMethod;
    this.init();
  }
  
  private async init() {
    try {
      this.instance = await this.asyncMethod;
      
      if (this.aadValue && this.instance.setAAD) {
        this.instance.setAAD(this.aadValue);
      }
      
      if (this.authTagValue && 'setAuthTag' in this.instance && this.instance.setAuthTag) {
        this.instance.setAuthTag(this.authTagValue);
      }
      
      this.processQueue();
    } catch (error) {
      console.error('Failed to initialize crypto instance:', error);
      this.pendingUpdates.forEach(update => update.reject(error));
      this.pendingUpdates = [];
    }
  }
  
  update(data: Uint8Array): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (this.instance) {
        this.instance.update(data).then(resolve).catch(reject);
      } else {
        this.pendingUpdates.push({ data, resolve, reject });
      }
    });
  }
  
  final(): Promise<Buffer> {
    if (this.instance) {
      return this.instance.final();
    } else {
      return new Promise((resolve, reject) => {
        this.asyncMethod
          .then(instance => instance.final())
          .then(resolve)
          .catch(reject);
      });
    }
  }
  
  setAAD(aad: Uint8Array): this {
    this.aadValue = aad;
    
    if (this.instance && this.instance.setAAD) {
      this.instance.setAAD(aad);
    }
    
    return this;
  }
  
  setAuthTag(authTag: Uint8Array): this {
    this.authTagValue = authTag;
    
    if (this.instance && 'setAuthTag' in this.instance && this.instance.setAuthTag) {
      this.instance.setAuthTag(authTag);
    }
    
    return this;
  }
  
  getAuthTag(): Promise<Uint8Array> {
    if (this.instance && this.instance.getAuthTag) {
      return Promise.resolve(this.instance.getAuthTag());
    }
    
    return this.asyncMethod.then(instance => {
      if (instance.getAuthTag) {
        return instance.getAuthTag();
      }
      throw new Error('getAuthTag not supported');
    });
  }
  
  private async processQueue() {
    if (this.isProcessing || !this.instance) return;
    
    this.isProcessing = true;
    
    try {
      while (this.pendingUpdates.length > 0) {
        const { data, resolve, reject } = this.pendingUpdates.shift()!;
        
        try {
          const result = await this.instance.update(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
      
      if (this.pendingUpdates.length > 0) {
        this.processQueue();
      }
    }
  }
}

// Export the API with error handling
export default {
  createCipheriv: (algorithm: string, key: any, iv: any) => {
    try {
      return new SyncCompatAdapter(localCrypto.createCipheriv(algorithm, key, iv));
    } catch (error) {
      console.error('Failed to create cipher:', error);
      throw error;
    }
  },
  
  createDecipheriv: (algorithm: string, key: any, iv: any) => {
    try {
      return new SyncCompatAdapter(localCrypto.createDecipheriv(algorithm, key, iv));
    } catch (error) {
      console.error('Failed to create decipher:', error);
      throw error;
    }
  },
  
  randomBytes: (size: number) => {
    try {
      return localCrypto.randomBytes(size);
    } catch (error) {
      console.error('Failed to generate random bytes:', error);
      throw error;
    }
  }
};