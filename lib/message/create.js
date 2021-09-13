"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTalkResponseMessage = exports.createTalkRequestMessage = exports.createNodesMessage = exports.createFindNodeMessage = exports.createPongMessage = exports.createPingMessage = exports.createRequestId = void 0;
const random_1 = require("bcrypto/lib/random");
const bigint_buffer_1 = require("bigint-buffer");
const types_1 = require("./types");
function createRequestId() {
    return bigint_buffer_1.toBigIntBE(random_1.randomBytes(8));
}
exports.createRequestId = createRequestId;
function createPingMessage(enrSeq) {
    return {
        type: types_1.MessageType.PING,
        id: createRequestId(),
        enrSeq,
    };
}
exports.createPingMessage = createPingMessage;
function createPongMessage(id, enrSeq, recipientIp, recipientPort) {
    return {
        type: types_1.MessageType.PONG,
        id,
        enrSeq,
        recipientIp,
        recipientPort,
    };
}
exports.createPongMessage = createPongMessage;
function createFindNodeMessage(distances) {
    return {
        type: types_1.MessageType.FINDNODE,
        id: createRequestId(),
        distances,
    };
}
exports.createFindNodeMessage = createFindNodeMessage;
function createNodesMessage(id, total, enrs) {
    return {
        type: types_1.MessageType.NODES,
        id,
        total,
        enrs,
    };
}
exports.createNodesMessage = createNodesMessage;
function createTalkRequestMessage(request, protocol) {
    return {
        type: types_1.MessageType.TALKREQ,
        id: createRequestId(),
        protocol: Buffer.from(protocol),
        request: Buffer.from(request),
    };
}
exports.createTalkRequestMessage = createTalkRequestMessage;
function createTalkResponseMessage(requestId, payload) {
    return {
        type: types_1.MessageType.TALKRESP,
        id: requestId,
        response: Buffer.from(payload),
    };
}
exports.createTalkResponseMessage = createTalkResponseMessage;
