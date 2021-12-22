"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENRKeyPair = exports.nodeId = exports.verify = exports.sign = exports.publicKey = exports.createPrivateKey = exports.hash = void 0;
const keccak = require("bcrypto/lib/keccak");
const secp256k1 = require("bcrypto/lib/secp256k1");
const create_1 = require("./create");
function hash(input) {
    return keccak.digest(input);
}
exports.hash = hash;
function createPrivateKey() {
    return secp256k1.privateKeyGenerate();
}
exports.createPrivateKey = createPrivateKey;
function publicKey(privKey) {
    return secp256k1.publicKeyCreate(privKey);
}
exports.publicKey = publicKey;
function sign(privKey, msg) {
    return secp256k1.sign(hash(msg), privKey);
}
exports.sign = sign;
function verify(pubKey, msg, sig) {
    return secp256k1.verify(hash(msg), sig, pubKey);
}
exports.verify = verify;
function nodeId(pubKey) {
    return create_1.createNodeId(hash(secp256k1.publicKeyConvert(pubKey, false).slice(1)));
}
exports.nodeId = nodeId;
class ENRKeyPair {
    constructor(privateKey) {
        if (privateKey) {
            if (!secp256k1.privateKeyVerify(privateKey)) {
                throw new Error("Invalid private key");
            }
        }
        this.privateKey = privateKey || createPrivateKey();
        this.publicKey = publicKey(this.privateKey);
        this.nodeId = nodeId(this.publicKey);
    }
    sign(msg) {
        return sign(this.privateKey, msg);
    }
    verify(msg, sig) {
        return verify(this.publicKey, msg, sig);
    }
}
exports.ENRKeyPair = ENRKeyPair;
