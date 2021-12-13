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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENR = void 0;
const multiaddr_1 = require("multiaddr");
const base64url_1 = __importDefault(require("base64url"));
const bigint_buffer_1 = require("bigint-buffer");
const RLP = __importStar(require("rlp"));
const convert_1 = __importDefault(require("multiaddr/src/convert"));
const varint_1 = require("varint");
const constants_1 = require("./constants");
const v4 = __importStar(require("./v4"));
const keypair_1 = require("../keypair");
const util_1 = require("../util");
class ENR extends Map {
    constructor(kvs = {}, seq = 1n, signature = null) {
        super(Object.entries(kvs));
        this.seq = seq;
        this.signature = signature;
    }
    static createV4(publicKey, kvs = {}) {
        return new ENR({
            ...kvs,
            id: Buffer.from("v4"),
            secp256k1: publicKey,
        });
    }
    static createFromPeerId(peerId, kvs = {}) {
        const keypair = keypair_1.createKeypairFromPeerId(peerId);
        switch (keypair.type) {
            case keypair_1.KeypairType.secp256k1:
                return ENR.createV4(keypair.publicKey, kvs);
            default:
                throw new Error();
        }
    }
    static decodeFromValues(decoded) {
        if (!Array.isArray(decoded)) {
            throw new Error("Decoded ENR must be an array");
        }
        if (decoded.length % 2 !== 0) {
            throw new Error("Decoded ENR must have an even number of elements");
        }
        const [signature, seq, ...kvs] = decoded;
        if (!signature || Array.isArray(signature)) {
            throw new Error("Decoded ENR invalid signature: must be a byte array");
        }
        if (!seq || Array.isArray(seq)) {
            throw new Error("Decoded ENR invalid sequence number: must be a byte array");
        }
        const obj = {};
        for (let i = 0; i < kvs.length; i += 2) {
            obj[kvs[i].toString()] = Buffer.from(kvs[i + 1]);
        }
        const enr = new ENR(obj, bigint_buffer_1.toBigIntBE(seq), signature);
        if (!enr.verify(RLP.encode([seq, ...kvs]), signature)) {
            throw new Error("Unable to verify enr signature");
        }
        return enr;
    }
    static decode(encoded) {
        const decoded = RLP.decode(encoded);
        return ENR.decodeFromValues(decoded);
    }
    static decodeTxt(encoded) {
        if (!encoded.startsWith("enr:")) {
            throw new Error("string encoded ENR must start with 'enr:'");
        }
        return ENR.decode(base64url_1.default.toBuffer(encoded.slice(4)));
    }
    set(k, v) {
        this.signature = null;
        this.seq++;
        return super.set(k, v);
    }
    get id() {
        const id = this.get("id");
        if (!id)
            throw new Error("id not found.");
        return id.toString("utf8");
    }
    get keypairType() {
        switch (this.id) {
            case "v4":
                return keypair_1.KeypairType.secp256k1;
            default:
                throw new Error(constants_1.ERR_INVALID_ID);
        }
    }
    get publicKey() {
        switch (this.id) {
            case "v4":
                return this.get("secp256k1");
            default:
                throw new Error(constants_1.ERR_INVALID_ID);
        }
    }
    get keypair() {
        return keypair_1.createKeypair(this.keypairType, undefined, this.publicKey);
    }
    async peerId() {
        return keypair_1.createPeerIdFromKeypair(this.keypair);
    }
    get nodeId() {
        switch (this.id) {
            case "v4":
                return v4.nodeId(this.publicKey);
            default:
                throw new Error(constants_1.ERR_INVALID_ID);
        }
    }
    get ip() {
        const raw = this.get("ip");
        if (raw) {
            return convert_1.default.toString(multiaddr_1.protocols.names.ip4.code, raw);
        }
        else {
            return undefined;
        }
    }
    set ip(ip) {
        if (ip) {
            this.set("ip", convert_1.default.toBytes(multiaddr_1.protocols.names.ip4.code, ip));
        }
        else {
            this.delete("ip");
        }
    }
    get tcp() {
        const raw = this.get("tcp");
        if (raw) {
            return Number(convert_1.default.toString(multiaddr_1.protocols.names.tcp.code, util_1.toNewUint8Array(raw)));
        }
        else {
            return undefined;
        }
    }
    set tcp(port) {
        if (port === undefined) {
            this.delete("tcp");
        }
        else {
            this.set("tcp", convert_1.default.toBytes(multiaddr_1.protocols.names.tcp.code, port));
        }
    }
    get udp() {
        const raw = this.get("udp");
        if (raw) {
            return Number(convert_1.default.toString(multiaddr_1.protocols.names.udp.code, util_1.toNewUint8Array(raw)));
        }
        else {
            return undefined;
        }
    }
    set udp(port) {
        if (port === undefined) {
            this.delete("udp");
        }
        else {
            this.set("udp", convert_1.default.toBytes(multiaddr_1.protocols.names.udp.code, port));
        }
    }
    get ip6() {
        const raw = this.get("ip6");
        if (raw) {
            return convert_1.default.toString(multiaddr_1.protocols.names.ip6.code, raw);
        }
        else {
            return undefined;
        }
    }
    set ip6(ip) {
        if (ip) {
            this.set("ip6", convert_1.default.toBytes(multiaddr_1.protocols.names.ip6.code, ip));
        }
        else {
            this.delete("ip6");
        }
    }
    get tcp6() {
        const raw = this.get("tcp6");
        if (raw) {
            return Number(convert_1.default.toString(multiaddr_1.protocols.names.tcp.code, raw));
        }
        else {
            return undefined;
        }
    }
    set tcp6(port) {
        if (port === undefined) {
            this.delete("tcp6");
        }
        else {
            this.set("tcp6", convert_1.default.toBytes(multiaddr_1.protocols.names.tcp.code, port));
        }
    }
    get udp6() {
        const raw = this.get("udp6");
        if (raw) {
            return Number(convert_1.default.toString(multiaddr_1.protocols.names.udp.code, raw));
        }
        else {
            return undefined;
        }
    }
    set udp6(port) {
        if (port === undefined) {
            this.delete("udp6");
        }
        else {
            this.set("udp6", convert_1.default.toBytes(multiaddr_1.protocols.names.udp.code, port));
        }
    }
    getLocationMultiaddr(protocol) {
        if (protocol === "udp") {
            return this.getLocationMultiaddr("udp4") || this.getLocationMultiaddr("udp6");
        }
        if (protocol === "tcp") {
            return this.getLocationMultiaddr("tcp4") || this.getLocationMultiaddr("tcp6");
        }
        const isIpv6 = protocol.endsWith("6");
        const ipVal = this.get(isIpv6 ? "ip6" : "ip");
        if (!ipVal) {
            return undefined;
        }
        const isUdp = protocol.startsWith("udp");
        const isTcp = protocol.startsWith("tcp");
        let protoName, protoVal;
        if (isUdp) {
            protoName = "udp";
            protoVal = isIpv6 ? this.get("udp6") : this.get("udp");
        }
        else if (isTcp) {
            protoName = "tcp";
            protoVal = isIpv6 ? this.get("tcp6") : this.get("tcp");
        }
        else {
            return undefined;
        }
        if (!protoVal) {
            return undefined;
        }
        // Create raw multiaddr buffer
        // multiaddr length is:
        //  1 byte for the ip protocol (ip4 or ip6)
        //  N bytes for the ip address
        //  1 or 2 bytes for the protocol as buffer (tcp or udp)
        //  2 bytes for the port
        const ipMa = multiaddr_1.protocols.names[isIpv6 ? "ip6" : "ip4"];
        const ipByteLen = ipMa.size / 8;
        const protoMa = multiaddr_1.protocols.names[protoName];
        const protoBuf = varint_1.encode(protoMa.code);
        const maBuf = new Uint8Array(3 + ipByteLen + protoBuf.length);
        maBuf[0] = ipMa.code;
        maBuf.set(ipVal, 1);
        maBuf.set(protoBuf, 1 + ipByteLen);
        maBuf.set(protoVal, 1 + ipByteLen + protoBuf.length);
        return new multiaddr_1.Multiaddr(maBuf);
    }
    setLocationMultiaddr(multiaddr) {
        const protoNames = multiaddr.protoNames();
        if (protoNames.length !== 2 && protoNames[1] !== "udp" && protoNames[1] !== "tcp") {
            throw new Error("Invalid multiaddr");
        }
        const tuples = multiaddr.tuples();
        if (!tuples[0][1] || !tuples[1][1]) {
            throw new Error("Invalid multiaddr");
        }
        // IPv4
        if (tuples[0][0] === 4) {
            this.set("ip", tuples[0][1]);
            this.set(protoNames[1], tuples[1][1]);
        }
        else {
            this.set("ip6", tuples[0][1]);
            this.set(protoNames[1] + "6", tuples[1][1]);
        }
    }
    async getFullMultiaddr(protocol) {
        const locationMultiaddr = this.getLocationMultiaddr(protocol);
        if (locationMultiaddr) {
            const peerId = await this.peerId();
            return locationMultiaddr.encapsulate(`/p2p/${peerId.toB58String()}`);
        }
    }
    verify(data, signature) {
        if (!this.get("id") || this.id !== "v4") {
            throw new Error(constants_1.ERR_INVALID_ID);
        }
        if (!this.publicKey) {
            throw new Error("Failed to verify enr: No public key");
        }
        return v4.verify(this.publicKey, data, signature);
    }
    sign(data, privateKey) {
        switch (this.id) {
            case "v4":
                this.signature = v4.sign(privateKey, data);
                break;
            default:
                throw new Error(constants_1.ERR_INVALID_ID);
        }
        return this.signature;
    }
    encodeToValues(privateKey) {
        // sort keys and flatten into [k, v, k, v, ...]
        const content = Array.from(this.keys())
            .sort((a, b) => a.localeCompare(b))
            .map((k) => [k, this.get(k)])
            .flat();
        content.unshift(Number(this.seq));
        if (privateKey) {
            content.unshift(this.sign(RLP.encode(content), privateKey));
        }
        else {
            if (!this.signature) {
                throw new Error(constants_1.ERR_NO_SIGNATURE);
            }
            content.unshift(this.signature);
        }
        return content;
    }
    encode(privateKey) {
        const encoded = RLP.encode(this.encodeToValues(privateKey));
        if (encoded.length >= constants_1.MAX_RECORD_SIZE) {
            throw new Error("ENR must be less than 300 bytes");
        }
        return encoded;
    }
    encodeTxt(privateKey) {
        return "enr:" + base64url_1.default.encode(Buffer.from(this.encode(privateKey)));
    }
}
exports.ENR = ENR;
