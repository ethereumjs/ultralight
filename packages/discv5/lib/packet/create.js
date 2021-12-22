"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWhoAreYouPacket = exports.createRandomPacket = exports.createHeader = void 0;
const random_1 = require("bcrypto/lib/random");
const constants_1 = require("./constants");
const encode_1 = require("./encode");
const types_1 = require("./types");
function createHeader(flag, authdata, nonce = random_1.randomBytes(constants_1.NONCE_SIZE)) {
    return {
        protocolId: "discv5",
        version: 1,
        flag,
        nonce,
        authdataSize: authdata.length,
        authdata,
    };
}
exports.createHeader = createHeader;
function createRandomPacket(srcId) {
    const authdata = encode_1.encodeMessageAuthdata({ srcId });
    const header = createHeader(types_1.PacketType.Message, authdata);
    const maskingIv = random_1.randomBytes(constants_1.MASKING_IV_SIZE);
    const message = random_1.randomBytes(44);
    return {
        maskingIv,
        header,
        message,
    };
}
exports.createRandomPacket = createRandomPacket;
function createWhoAreYouPacket(nonce, enrSeq) {
    const idNonce = random_1.randomBytes(constants_1.ID_NONCE_SIZE);
    const authdata = encode_1.encodeWhoAreYouAuthdata({ idNonce, enrSeq });
    const header = createHeader(types_1.PacketType.WhoAreYou, authdata, nonce);
    const maskingIv = random_1.randomBytes(constants_1.MASKING_IV_SIZE);
    const message = Buffer.alloc(0);
    return {
        maskingIv,
        header,
        message,
    };
}
exports.createWhoAreYouPacket = createWhoAreYouPacket;
