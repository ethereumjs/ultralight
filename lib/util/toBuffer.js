"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferToNumber = exports.numberToBuffer = exports.toNewUint8Array = exports.toBuffer = void 0;
function toBuffer(arr) {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.length);
}
exports.toBuffer = toBuffer;
// multiaddr 8.0.0 expects an Uint8Array with internal buffer starting at 0 offset
function toNewUint8Array(buf) {
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return new Uint8Array(arrayBuffer);
}
exports.toNewUint8Array = toNewUint8Array;
function numberToBuffer(value, length) {
    const res = Buffer.alloc(length);
    res.writeUIntBE(value, 0, length);
    return res;
}
exports.numberToBuffer = numberToBuffer;
function bufferToNumber(buffer, length, offset = 0) {
    return buffer.readUIntBE(offset, length);
}
exports.bufferToNumber = bufferToNumber;
