"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Secp256k1Keypair = exports.secp256k1PublicKeyToRaw = exports.secp256k1PublicKeyToFull = exports.secp256k1PublicKeyToCompressed = void 0;
const secp256k1 = require("bcrypto/lib/secp256k1");
const types_1 = require("./types");
const constants_1 = require("./constants");
function secp256k1PublicKeyToCompressed(publicKey) {
    if (publicKey.length === 64) {
        publicKey = Buffer.concat([Buffer.from([4]), publicKey]);
    }
    return secp256k1.publicKeyConvert(publicKey, true);
}
exports.secp256k1PublicKeyToCompressed = secp256k1PublicKeyToCompressed;
function secp256k1PublicKeyToFull(publicKey) {
    if (publicKey.length === 64) {
        return Buffer.concat([Buffer.from([4]), publicKey]);
    }
    return secp256k1.publicKeyConvert(publicKey, false);
}
exports.secp256k1PublicKeyToFull = secp256k1PublicKeyToFull;
function secp256k1PublicKeyToRaw(publicKey) {
    return secp256k1.publicKeyConvert(publicKey, false).slice(1);
}
exports.secp256k1PublicKeyToRaw = secp256k1PublicKeyToRaw;
exports.Secp256k1Keypair = class Secp256k1Keypair extends types_1.AbstractKeypair {
    constructor(privateKey, publicKey) {
        let pub = publicKey;
        if (pub) {
            pub = secp256k1PublicKeyToCompressed(pub);
        }
        super(privateKey, pub);
        this.type = types_1.KeypairType.secp256k1;
    }
    static generate() {
        const privateKey = secp256k1.privateKeyGenerate();
        const publicKey = secp256k1.publicKeyCreate(privateKey);
        return new Secp256k1Keypair(privateKey, publicKey);
    }
    privateKeyVerify(key = this._privateKey) {
        if (key) {
            return secp256k1.privateKeyVerify(key);
        }
        return true;
    }
    publicKeyVerify(key = this._publicKey) {
        if (key) {
            return secp256k1.publicKeyVerify(key);
        }
        return true;
    }
    sign(msg) {
        return secp256k1.sign(msg, this.privateKey);
    }
    verify(msg, sig) {
        return secp256k1.verify(msg, sig, this.publicKey);
    }
    deriveSecret(keypair) {
        if (keypair.type !== this.type) {
            throw new Error(constants_1.ERR_INVALID_KEYPAIR_TYPE);
        }
        return secp256k1.derive(keypair.publicKey, this.privateKey);
    }
};
