"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromHex = exports.toHex = void 0;
function toHex(buf) {
    return buf.toString("hex");
}
exports.toHex = toHex;
function fromHex(str) {
    return Buffer.from(str, "hex");
}
exports.fromHex = fromHex;
