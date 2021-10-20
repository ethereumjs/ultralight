"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKeypairFromPeerId = exports.createPeerIdFromKeypair = exports.createKeypair = exports.generateKeypair = void 0;
const peer_id_1 = __importDefault(require("peer-id"));
const libp2p_crypto_1 = require("libp2p-crypto");
const { keysPBM, supportedKeys } = libp2p_crypto_1.keys;
const types_1 = require("./types");
const constants_1 = require("./constants");
const secp256k1_1 = require("./secp256k1");
const util_1 = require("../util");
const multihashes_1 = __importDefault(require("multihashes"));
__exportStar(require("./types"), exports);
__exportStar(require("./secp256k1"), exports);
function generateKeypair(type) {
    switch (type) {
        case types_1.KeypairType.secp256k1:
            return secp256k1_1.Secp256k1Keypair.generate();
        default:
            throw new Error(constants_1.ERR_TYPE_NOT_IMPLEMENTED);
    }
}
exports.generateKeypair = generateKeypair;
function createKeypair(type, privateKey, publicKey) {
    switch (type) {
        case types_1.KeypairType.secp256k1:
            return new secp256k1_1.Secp256k1Keypair(privateKey, publicKey);
        default:
            throw new Error(constants_1.ERR_TYPE_NOT_IMPLEMENTED);
    }
}
exports.createKeypair = createKeypair;
async function createPeerIdFromKeypair(keypair) {
    switch (keypair.type) {
        case types_1.KeypairType.secp256k1: {
            // manually create a peer id to avoid expensive ops
            const privKey = keypair.hasPrivateKey()
                ? new supportedKeys.secp256k1.Secp256k1PrivateKey(keypair.privateKey, keypair.publicKey)
                : undefined;
            const pubKey = new supportedKeys.secp256k1.Secp256k1PublicKey(keypair.publicKey);
            const id = multihashes_1.default.encode(pubKey.bytes, "identity");
            return new peer_id_1.default(id, privKey, pubKey);
        }
        default:
            throw new Error(constants_1.ERR_TYPE_NOT_IMPLEMENTED);
    }
}
exports.createPeerIdFromKeypair = createPeerIdFromKeypair;
function createKeypairFromPeerId(peerId) {
    // pub/privkey bytes from peer-id are encoded in protobuf format
    const pub = keysPBM.PublicKey.decode(peerId.pubKey.bytes);
    return createKeypair(pub.Type, peerId.privKey ? util_1.toBuffer(peerId.privKey.marshal()) : undefined, util_1.toBuffer(pub.Data));
}
exports.createKeypairFromPeerId = createKeypairFromPeerId;
