"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractKeypair = exports.KeypairType = void 0;
var KeypairType;
(function (KeypairType) {
    KeypairType[KeypairType["rsa"] = 0] = "rsa";
    KeypairType[KeypairType["ed25519"] = 1] = "ed25519";
    KeypairType[KeypairType["secp256k1"] = 2] = "secp256k1";
})(KeypairType = exports.KeypairType || (exports.KeypairType = {}));
class AbstractKeypair {
    constructor(privateKey, publicKey) {
        if ((this._privateKey = privateKey) && !this.privateKeyVerify()) {
            throw new Error("Invalid private key");
        }
        if ((this._publicKey = publicKey) && !this.publicKeyVerify()) {
            throw new Error("Invalid private key");
        }
    }
    get privateKey() {
        if (!this._privateKey) {
            throw new Error();
        }
        return this._privateKey;
    }
    get publicKey() {
        if (!this._publicKey) {
            throw new Error();
        }
        return this._publicKey;
    }
    privateKeyVerify() {
        return true;
    }
    publicKeyVerify() {
        return true;
    }
    hasPrivateKey() {
        return Boolean(this._privateKey);
    }
}
exports.AbstractKeypair = AbstractKeypair;
