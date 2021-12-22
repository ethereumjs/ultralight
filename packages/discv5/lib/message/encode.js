"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeTopicQueryMessage = exports.encodeRegConfirmMessage = exports.encodeTicketMessage = exports.encodeRegTopicMessage = exports.encodeTalkRespMessage = exports.encodeTalkReqMessage = exports.encodeNodesMessage = exports.encodeFindNodeMessage = exports.encodePongMessage = exports.encodePingMessage = exports.encode = void 0;
const RLP = __importStar(require("rlp"));
const multiaddr_1 = require("multiaddr");
const isIp = require("is-ip");
const types_1 = require("./types");
function encode(message) {
    switch (message.type) {
        case types_1.MessageType.PING:
            return encodePingMessage(message);
        case types_1.MessageType.PONG:
            return encodePongMessage(message);
        case types_1.MessageType.FINDNODE:
            return encodeFindNodeMessage(message);
        case types_1.MessageType.NODES:
            return encodeNodesMessage(message);
        case types_1.MessageType.TALKREQ:
            return encodeTalkReqMessage(message);
        case types_1.MessageType.TALKRESP:
            return encodeTalkRespMessage(message);
        case types_1.MessageType.REGTOPIC:
            return encodeRegTopicMessage(message);
        case types_1.MessageType.TICKET:
            return encodeTicketMessage(message);
        case types_1.MessageType.REGCONFIRMATION:
            return encodeRegConfirmMessage(message);
        case types_1.MessageType.TOPICQUERY:
            return encodeTopicQueryMessage(message);
    }
}
exports.encode = encode;
// TODO remove when rlp supports bigint encoding directly
function toBuffer(n) {
    let hex = n.toString(16);
    if (hex.length % 2 === 1) {
        hex = "0" + hex;
    }
    return Buffer.from(hex, "hex");
}
function encodePingMessage(m) {
    return Buffer.concat([Buffer.from([types_1.MessageType.PING]), RLP.encode([toBuffer(m.id), toBuffer(m.enrSeq)])]);
}
exports.encodePingMessage = encodePingMessage;
function encodePongMessage(m) {
    const ipMultiaddr = new multiaddr_1.Multiaddr(`/${isIp.v4(m.recipientIp) ? "ip4" : "ip6"}/${m.recipientIp}`);
    const tuple = ipMultiaddr.tuples()[0][1];
    if (!tuple) {
        throw new Error("invalid address for encoding");
    }
    return Buffer.concat([
        Buffer.from([types_1.MessageType.PONG]),
        RLP.encode([toBuffer(m.id), toBuffer(m.enrSeq), tuple, m.recipientPort]),
    ]);
}
exports.encodePongMessage = encodePongMessage;
function encodeFindNodeMessage(m) {
    return Buffer.concat([Buffer.from([types_1.MessageType.FINDNODE]), RLP.encode([toBuffer(m.id), m.distances])]);
}
exports.encodeFindNodeMessage = encodeFindNodeMessage;
function encodeNodesMessage(m) {
    return Buffer.concat([
        Buffer.from([types_1.MessageType.NODES]),
        RLP.encode([toBuffer(m.id), m.total, m.enrs.map((enr) => enr.encodeToValues())]),
    ]);
}
exports.encodeNodesMessage = encodeNodesMessage;
function encodeTalkReqMessage(m) {
    return Buffer.concat([Buffer.from([types_1.MessageType.TALKREQ]), RLP.encode([toBuffer(m.id), m.protocol, m.request])]);
}
exports.encodeTalkReqMessage = encodeTalkReqMessage;
function encodeTalkRespMessage(m) {
    return Buffer.concat([Buffer.from([types_1.MessageType.TALKRESP]), RLP.encode([toBuffer(m.id), m.response])]);
}
exports.encodeTalkRespMessage = encodeTalkRespMessage;
function encodeRegTopicMessage(m) {
    return Buffer.concat([
        Buffer.from([types_1.MessageType.REGTOPIC]),
        RLP.encode([toBuffer(m.id), m.topic, m.enr.encodeToValues(), m.ticket]),
    ]);
}
exports.encodeRegTopicMessage = encodeRegTopicMessage;
function encodeTicketMessage(m) {
    return Buffer.concat([Buffer.from([types_1.MessageType.TICKET]), RLP.encode([toBuffer(m.id), m.ticket, m.waitTime])]);
}
exports.encodeTicketMessage = encodeTicketMessage;
function encodeRegConfirmMessage(m) {
    return Buffer.concat([Buffer.from([types_1.MessageType.REGCONFIRMATION]), RLP.encode([toBuffer(m.id), m.topic])]);
}
exports.encodeRegConfirmMessage = encodeRegConfirmMessage;
function encodeTopicQueryMessage(m) {
    return Buffer.concat([Buffer.from([types_1.MessageType.TOPICQUERY]), RLP.encode([toBuffer(m.id), m.topic])]);
}
exports.encodeTopicQueryMessage = encodeTopicQueryMessage;
