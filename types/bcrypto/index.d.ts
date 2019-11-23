/// <reference types="node"/>

declare module "bcrypto/lib/keccak" {
  /**
   * keccak.js - Keccak/SHA3 implementation for bcrypto
   * Copyright (c) 2017-2019, Christopher Jeffrey (MIT License).
   * https://github.com/bcoin-org/bcrypto
   *
   * Parts of this software are based on emn178/js-sha3:
   *   Copyright (c) 2015-2017, Chen, Yi-Cyuan (MIT License).
   *   https://github.com/emn178/js-sha3
   *
   * Parts of this software are based on rhash/RHash:
   *   Copyright (c) 2005-2014, Aleksey Kravchenko
   *   https://github.com/rhash/RHash
   *
   * Resources:
   *   https://en.wikipedia.org/wiki/SHA-3
   *   https://keccak.team/specifications.html
   *   https://csrc.nist.gov/projects/hash-functions/sha-3-project/sha-3-standardization
   *   http://dx.doi.org/10.6028/NIST.FIPS.202
   *   https://github.com/rhash/RHash/blob/master/librhash/sha3.c
   *   https://github.com/emn178/js-sha3/blob/master/src/sha3.js
   */
  class Keccak {
    native: number;
    id: string;
    size: number;
    bits: number;
    blockSize: number;
    zero: Buffer;
    ctx: Keccak;
    static hash(): Keccak;
    // static hmac(bits?: number, pad?: number, len?: number): HMAC;
    static digest(data: Buffer, bits?: number, pad?: number, len?: number): Buffer;
    static root(left: Buffer, right: Buffer, bits?: number, pad?: number, len?: number): Buffer;
    static multi(x: Buffer, y: Buffer, z: Buffer, bits?: number, pad?: number, len?: number): Buffer;
    static mac(data: Buffer, key: Buffer, bits?: number, pad?: number, len?: number): Buffer;
    init(bits?: number): this;
    update(data: Buffer): this;
    final(pad: number, len?: number): Buffer;
  }

  export = Keccak;
}

declare module "bcrypto/lib/secp256k1" {
  export function privateKeyGenerate(): Buffer;
  export function privateKeyVerify(key: Buffer): boolean;
  export function publicKeyCreate(key: Buffer, compress?: boolean): Buffer;
  export function publicKeyConvert(pub: Buffer, compress?: boolean): Buffer;
  export function sign(msg: Buffer, key: Buffer): Buffer;
  export function verify(msg: Buffer, sig: Buffer, key: Buffer): boolean;
}
