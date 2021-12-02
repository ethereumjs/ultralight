import cipher = require("bcrypto/lib/cipher");

export function aesCtrEncrypt(key: Buffer, iv: Buffer, pt: Buffer): Buffer {
  const ctx = new cipher.Cipher("AES-128-CTR");
  ctx.init(key, iv);
  ctx.update(pt);
  return ctx.final();
}

export function aesCtrDecrypt(key: Buffer, iv: Buffer, pt: Buffer): Buffer {
  const ctx = new cipher.Decipher("AES-128-CTR");
  ctx.init(key, iv);
  ctx.update(pt);
  return ctx.final();
}
