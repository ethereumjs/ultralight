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
exports.decode = void 0;
const RLP = __importStar(require("rlp"));
const ip_1 = require("multiaddr/src/ip");
const bigint_buffer_1 = require("bigint-buffer");
const ip6addr = __importStar(require("ip6addr"));
const types_1 = require("./types");
const enr_1 = require("../enr");
const ERR_INVALID_MESSAGE = "invalid message";
function decode(data) {
    const type = data[0];
    switch (type) {
        case types_1.MessageType.PING:
            return decodePing(data);
        case types_1.MessageType.PONG:
            return decodePong(data);
        case types_1.MessageType.FINDNODE:
            return decodeFindNode(data);
        case types_1.MessageType.NODES:
            return decodeNodes(data);
        case types_1.MessageType.TALKREQ:
            return decodeTalkReq(data);
        case types_1.MessageType.TALKRESP:
            return decodeTalkResp(data);
        case types_1.MessageType.REGTOPIC:
            return decodeRegTopic(data);
        case types_1.MessageType.TICKET:
            return decodeTicket(data);
        case types_1.MessageType.REGCONFIRMATION:
            return decodeRegConfirmation(data);
        case types_1.MessageType.TOPICQUERY:
            return decodeTopicQuery(data);
        default:
            throw new Error(ERR_INVALID_MESSAGE);
    }
}
exports.decode = decode;
function decodePing(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    return {
        type: types_1.MessageType.PING,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        enrSeq: bigint_buffer_1.toBigIntBE(rlpRaw[1]),
    };
}
function decodePong(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 4) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    let stringIpAddr = ip_1.toString(rlpRaw[2]);
    const parsedIp = ip6addr.parse(stringIpAddr);
    if (parsedIp.kind() === "ipv4") {
        stringIpAddr = parsedIp.toString({ format: "v4" });
    }
    return {
        type: types_1.MessageType.PONG,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        enrSeq: bigint_buffer_1.toBigIntBE(rlpRaw[1]),
        recipientIp: stringIpAddr,
        recipientPort: rlpRaw[3].length ? rlpRaw[3].readUIntBE(0, rlpRaw[3].length) : 0,
    };
}
function decodeFindNode(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    if (!Array.isArray(rlpRaw[1])) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    const distances = rlpRaw[1].map((x) => (x.length ? x.readUIntBE(0, x.length) : 0));
    return {
        type: types_1.MessageType.FINDNODE,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        distances,
    };
}
function decodeNodes(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 3 || !Array.isArray(rlpRaw[2])) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    return {
        type: types_1.MessageType.NODES,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        total: rlpRaw[1].length ? rlpRaw[1].readUIntBE(0, rlpRaw[1].length) : 0,
        enrs: rlpRaw[2].map((enrRaw) => enr_1.ENR.decodeFromValues(enrRaw)),
    };
}
function decodeTalkReq(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 3) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    return {
        type: types_1.MessageType.TALKREQ,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        protocol: rlpRaw[1],
        request: rlpRaw[2],
    };
}
function decodeTalkResp(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    return {
        type: types_1.MessageType.TALKRESP,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        response: rlpRaw[1],
    };
}
function decodeRegTopic(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 4 || !Array.isArray(rlpRaw[2])) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    return {
        type: types_1.MessageType.REGTOPIC,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        topic: rlpRaw[1],
        enr: enr_1.ENR.decodeFromValues(rlpRaw[2]),
        ticket: rlpRaw[3],
    };
}
function decodeTicket(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 3) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    return {
        type: types_1.MessageType.TICKET,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        ticket: rlpRaw[1],
        waitTime: rlpRaw[2].length ? rlpRaw[2].readUIntBE(0, rlpRaw[2].length) : 0,
    };
}
function decodeRegConfirmation(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    return {
        type: types_1.MessageType.REGCONFIRMATION,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        topic: rlpRaw[1],
    };
}
function decodeTopicQuery(data) {
    const rlpRaw = RLP.decode(data.slice(1));
    if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
        throw new Error(ERR_INVALID_MESSAGE);
    }
    return {
        type: types_1.MessageType.TOPICQUERY,
        id: bigint_buffer_1.toBigIntBE(rlpRaw[0]),
        topic: rlpRaw[1],
    };
}
