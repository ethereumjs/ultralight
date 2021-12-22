"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeChallengeData = exports.decodeHandshakeAuthdata = exports.decodeMessageAuthdata = exports.decodeWhoAreYouAuthdata = exports.encodeHandshakeAuthdata = exports.encodeMessageAuthdata = exports.encodeWhoAreYouAuthdata = exports.decodeHeader = exports.decodePacket = exports.encodeHeader = exports.encodePacket = void 0;
const cipher = require("bcrypto/lib/cipher");
const bigint_buffer_1 = require("bigint-buffer");
const err_code_1 = __importDefault(require("err-code"));
const util_1 = require("../util");
const constants_1 = require("./constants");
const types_1 = require("./types");
function encodePacket(destId, packet) {
    return Buffer.concat([packet.maskingIv, encodeHeader(destId, packet.maskingIv, packet.header), packet.message]);
}
exports.encodePacket = encodePacket;
function encodeHeader(destId, maskingIv, header) {
    const ctx = new cipher.Cipher("AES-128-CTR");
    ctx.init(util_1.fromHex(destId).slice(0, constants_1.MASKING_KEY_SIZE), maskingIv);
    return ctx.update(Buffer.concat([
        // static header
        Buffer.from(header.protocolId, "ascii"),
        util_1.numberToBuffer(header.version, constants_1.VERSION_SIZE),
        util_1.numberToBuffer(header.flag, constants_1.FLAG_SIZE),
        header.nonce,
        util_1.numberToBuffer(header.authdataSize, constants_1.AUTHDATA_SIZE_SIZE),
        // authdata
        header.authdata,
    ]));
}
exports.encodeHeader = encodeHeader;
function decodePacket(srcId, data) {
    if (data.length < constants_1.MIN_PACKET_SIZE) {
        throw err_code_1.default(new Error(`Packet too small: ${data.length}`), constants_1.ERR_TOO_SMALL);
    }
    if (data.length > constants_1.MAX_PACKET_SIZE) {
        throw err_code_1.default(new Error(`Packet too large: ${data.length}`), constants_1.ERR_TOO_LARGE);
    }
    const maskingIv = data.slice(0, constants_1.MASKING_IV_SIZE);
    const [header, headerBuf] = decodeHeader(srcId, maskingIv, data.slice(constants_1.MASKING_IV_SIZE));
    const message = data.slice(constants_1.MASKING_IV_SIZE + headerBuf.length);
    return {
        maskingIv,
        header,
        message,
        messageAd: Buffer.concat([maskingIv, headerBuf]),
    };
}
exports.decodePacket = decodePacket;
/**
 * Return the decoded header and the header as a buffer
 */
function decodeHeader(srcId, maskingIv, data) {
    const ctx = new cipher.Decipher("AES-128-CTR");
    ctx.init(util_1.fromHex(srcId).slice(0, constants_1.MASKING_KEY_SIZE), maskingIv);
    // unmask the static header
    const staticHeaderBuf = ctx.update(data.slice(0, constants_1.STATIC_HEADER_SIZE));
    // validate the static header field by field
    const protocolId = staticHeaderBuf.slice(0, constants_1.PROTOCOL_SIZE).toString("ascii");
    if (protocolId !== "discv5") {
        throw err_code_1.default(new Error(`Invalid protocol id: ${protocolId}`), constants_1.ERR_INVALID_PROTOCOL_ID);
    }
    const version = util_1.bufferToNumber(staticHeaderBuf.slice(constants_1.PROTOCOL_SIZE, constants_1.PROTOCOL_SIZE + constants_1.VERSION_SIZE), constants_1.VERSION_SIZE);
    if (version !== 1) {
        throw err_code_1.default(new Error(`Invalid version: ${version}`), constants_1.ERR_INVALID_VERSION);
    }
    const flag = util_1.bufferToNumber(staticHeaderBuf.slice(constants_1.PROTOCOL_SIZE + constants_1.VERSION_SIZE, constants_1.PROTOCOL_SIZE + constants_1.VERSION_SIZE + constants_1.FLAG_SIZE), constants_1.FLAG_SIZE);
    if (types_1.PacketType[flag] == null) {
        throw err_code_1.default(new Error(`Invalid flag: ${flag}`), constants_1.ERR_INVALID_FLAG);
    }
    const nonce = staticHeaderBuf.slice(constants_1.PROTOCOL_SIZE + constants_1.VERSION_SIZE + constants_1.FLAG_SIZE, constants_1.PROTOCOL_SIZE + constants_1.VERSION_SIZE + constants_1.FLAG_SIZE + constants_1.NONCE_SIZE);
    const authdataSize = util_1.bufferToNumber(staticHeaderBuf.slice(constants_1.PROTOCOL_SIZE + constants_1.VERSION_SIZE + constants_1.FLAG_SIZE + constants_1.NONCE_SIZE), constants_1.AUTHDATA_SIZE_SIZE);
    // Once the authdataSize is known, unmask the authdata
    const authdata = ctx.update(data.slice(constants_1.STATIC_HEADER_SIZE, constants_1.STATIC_HEADER_SIZE + authdataSize));
    return [
        {
            protocolId,
            version,
            flag,
            nonce,
            authdataSize,
            authdata,
        },
        Buffer.concat([staticHeaderBuf, authdata]),
    ];
}
exports.decodeHeader = decodeHeader;
// authdata
function encodeWhoAreYouAuthdata(authdata) {
    return Buffer.concat([authdata.idNonce, bigint_buffer_1.toBufferBE(authdata.enrSeq, 8)]);
}
exports.encodeWhoAreYouAuthdata = encodeWhoAreYouAuthdata;
function encodeMessageAuthdata(authdata) {
    return util_1.fromHex(authdata.srcId);
}
exports.encodeMessageAuthdata = encodeMessageAuthdata;
function encodeHandshakeAuthdata(authdata) {
    return Buffer.concat([
        util_1.fromHex(authdata.srcId),
        util_1.numberToBuffer(authdata.sigSize, constants_1.SIG_SIZE_SIZE),
        util_1.numberToBuffer(authdata.ephKeySize, constants_1.EPH_KEY_SIZE_SIZE),
        authdata.idSignature,
        authdata.ephPubkey,
        authdata.record || Buffer.alloc(0),
    ]);
}
exports.encodeHandshakeAuthdata = encodeHandshakeAuthdata;
function decodeWhoAreYouAuthdata(data) {
    if (data.length !== constants_1.WHOAREYOU_AUTHDATA_SIZE) {
        throw err_code_1.default(new Error(`Invalid authdata length: ${data.length}`), constants_1.ERR_INVALID_AUTHDATA_SIZE);
    }
    return {
        idNonce: data.slice(0, constants_1.ID_NONCE_SIZE),
        enrSeq: bigint_buffer_1.toBigIntBE(data.slice(constants_1.ID_NONCE_SIZE)),
    };
}
exports.decodeWhoAreYouAuthdata = decodeWhoAreYouAuthdata;
function decodeMessageAuthdata(data) {
    if (data.length !== constants_1.MESSAGE_AUTHDATA_SIZE) {
        throw err_code_1.default(new Error(`Invalid authdata length: ${data.length}`), constants_1.ERR_INVALID_AUTHDATA_SIZE);
    }
    return {
        srcId: util_1.toHex(data),
    };
}
exports.decodeMessageAuthdata = decodeMessageAuthdata;
function decodeHandshakeAuthdata(data) {
    if (data.length < constants_1.MIN_HANDSHAKE_AUTHDATA_SIZE) {
        throw err_code_1.default(new Error(`Invalid authdata length: ${data.length}`), constants_1.ERR_INVALID_AUTHDATA_SIZE);
    }
    const srcId = util_1.toHex(data.slice(0, 32));
    const sigSize = data[32];
    const ephKeySize = data[33];
    const idSignature = data.slice(34, 34 + sigSize);
    const ephPubkey = data.slice(34 + sigSize, 34 + sigSize + ephKeySize);
    const record = data.slice(34 + sigSize + ephKeySize);
    return {
        srcId,
        sigSize,
        ephKeySize,
        idSignature,
        ephPubkey,
        record,
    };
}
exports.decodeHandshakeAuthdata = decodeHandshakeAuthdata;
/**
 * Encode Challenge Data given masking IV and header
 * Challenge data doubles as message authenticated data
 */
function encodeChallengeData(maskingIv, header) {
    return Buffer.concat([
        maskingIv,
        Buffer.from(header.protocolId),
        util_1.numberToBuffer(header.version, constants_1.VERSION_SIZE),
        util_1.numberToBuffer(header.flag, constants_1.FLAG_SIZE),
        header.nonce,
        util_1.numberToBuffer(header.authdataSize, constants_1.AUTHDATA_SIZE_SIZE),
        header.authdata,
    ]);
}
exports.encodeChallengeData = encodeChallengeData;
