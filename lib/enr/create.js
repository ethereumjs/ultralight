"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeId = void 0;
const util_1 = require("../util");
function createNodeId(buffer) {
    if (buffer.length !== 32) {
        throw new Error("NodeId must be 32 bytes in length");
    }
    return util_1.toHex(buffer);
}
exports.createNodeId = createNodeId;
