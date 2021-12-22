"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aesCtrDecrypt = exports.aesCtrEncrypt = void 0;
const cipher = require("bcrypto/lib/cipher");
function aesCtrEncrypt(key, iv, pt) {
    const ctx = new cipher.Cipher("AES-128-CTR");
    ctx.init(key, iv);
    ctx.update(pt);
    return ctx.final();
}
exports.aesCtrEncrypt = aesCtrEncrypt;
function aesCtrDecrypt(key, iv, pt) {
    const ctx = new cipher.Decipher("AES-128-CTR");
    ctx.init(key, iv);
    ctx.update(pt);
    return ctx.final();
}
exports.aesCtrDecrypt = aesCtrDecrypt;
